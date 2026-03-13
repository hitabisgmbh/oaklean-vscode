import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest
} from '@jest/globals'
import {
	SourceNodeGraph,
	SourceNodeMetaData,
	UnifiedPath
} from '@oaklean/profiler-core'

import {
	buildForeignReferences,
	getCallerNodeIDsForCurrentNode,
	isSourceNodeGraphLike,
	resolveCurrentFunctionGraphNodeID,
	SourceNodeGraphLike
} from '../../src/WebViewProviders/EditorFileMethodReferenceView/EditorFileMethodReferenceGraph'
import WorkspaceUtils from '../../src/helper/WorkspaceUtils'

jest.mock('vscode')

type GraphNode = NonNullable<
	ReturnType<SourceNodeGraphLike['sourceNodes']['get']>
>
type GraphNodeID = NonNullable<GraphNode['id']>
type SourceNodeGraphNodeID = NonNullable<
	Parameters<typeof buildForeignReferences>[1]
>
type SourceNodeIdentifier = GraphNode['sourceNodeIndex']['identifier']
type SourcePathIdentifier =
	GraphNode['sourceNodeIndex']['pathIndex']['identifier']
type GlobalIdentifierValue = ReturnType<
	GraphNode['globalIdentifier']
>['identifier']
type CurrentFunctionLikeArg = Parameters<
	typeof resolveCurrentFunctionGraphNodeID
>[1]

// Cast helper to keep IDs readable in tests without leaking real profiler internals.
function toGraphNodeID(id: number): GraphNodeID {
	return id as unknown as GraphNodeID
}

function toSourceNodeGraphNodeID(id: string): SourceNodeGraphNodeID {
	return id as unknown as SourceNodeGraphNodeID
}

function toSourceNodeIdentifier(identifier: string): SourceNodeIdentifier {
	return identifier as unknown as SourceNodeIdentifier
}

function toSourcePathIdentifier(path: string): SourcePathIdentifier {
	return path as unknown as SourcePathIdentifier
}

function toGlobalIdentifierValue(identifier: string): GlobalIdentifierValue {
	return identifier as unknown as GlobalIdentifierValue
}

function createSourceNodeIndex(identifier: string, path?: string) {
	return {
		identifier: toSourceNodeIdentifier(identifier),
		pathIndex:
			path === undefined
				? undefined
				: { identifier: toSourcePathIdentifier(path) }
	} as unknown as GraphNode['sourceNodeIndex']
}

function createGlobalIdentifier(
	identifier: string,
	sourceNodeIdentifier?: string
) {
	return {
		identifier: toGlobalIdentifierValue(identifier),
		sourceNodeIdentifier:
			sourceNodeIdentifier === undefined
				? undefined
				: toSourceNodeIdentifier(sourceNodeIdentifier)
	} as unknown as ReturnType<GraphNode['globalIdentifier']>
}

function createGraphNode(node: Partial<GraphNode>): GraphNode {
	const graphNode = {
		globalIdentifier: () => createGlobalIdentifier('{scope:(unknown)}'),
		toJSON: undefined,
		...node
	}
	Object.setPrototypeOf(graphNode, SourceNodeMetaData.prototype)
	return graphNode as unknown as GraphNode
}

function asCurrentFunctionLike(value: unknown): CurrentFunctionLikeArg {
	return value as CurrentFunctionLikeArg
}

// Minimal in-memory graph factory that matches the runtime API used by graph helpers.
function createGraph() {
	const sourceNodes = new Map<string, GraphNode>()
	const incomingEdges = new Map<string, Map<string, boolean>>()
	const outgoingEdges = new Map<string, Map<string, boolean>>()

	return {
		sourceNodes,
		incomingEdges,
		outgoingEdges,
		asGraph(): SourceNodeGraphLike {
			return {
				sourceNodes: {
					entries: () => sourceNodes.entries(),
					get: (key: string) => sourceNodes.get(key)
				},
				incomingEdges: {
					get: (key: string) => incomingEdges.get(key)
				},
				outgoingEdges: {
					get: (key: string) => outgoingEdges.get(key)
				}
			} as unknown as SourceNodeGraphLike
		}
	}
}

describe('EditorFileMethodReferenceGraph', () => {
	beforeEach(() => {
		// Default to "path not resolvable"; tests override this when needed.
		jest
			.spyOn(WorkspaceUtils, 'getRelativeWorkspacePath')
			.mockReturnValue(undefined)
	})

	afterEach(() => {
		jest.restoreAllMocks()
	})

	it('validates graph-like runtime shape', () => {
		// Runtime guard now checks concrete SourceNodeGraph instances.
		expect(isSourceNodeGraphLike(new SourceNodeGraph())).toBe(true)
		expect(isSourceNodeGraphLike(createGraph().asGraph())).toBe(false)
		expect(isSourceNodeGraphLike(undefined)).toBe(false)
		expect(isSourceNodeGraphLike({ sourceNodes: {} })).toBe(false)
	})

	it('resolves current node by id and disambiguates by current file path', () => {
		// Two nodes share id+identifier; current editor file path should pick the right one.
		const graph = createGraph()
		graph.sourceNodes.set(
			'node-a',
			createGraphNode({
				id: toGraphNodeID(1),
				sourceNodeIndex: createSourceNodeIndex(
					'{function:selected}',
					'./src/a.ts'
				)
			})
		)
		graph.sourceNodes.set(
			'node-b',
			createGraphNode({
				id: toGraphNodeID(1),
				sourceNodeIndex: createSourceNodeIndex(
					'{function:selected}',
					'./src/b.ts'
				)
			})
		)

		jest
			.spyOn(WorkspaceUtils, 'getRelativeWorkspacePath')
			.mockReturnValue(new UnifiedPath('./src/b.ts'))

		const nodeID = resolveCurrentFunctionGraphNodeID(
			graph.asGraph(),
			asCurrentFunctionLike({
				id: toGraphNodeID(1),
				sourceNodeIndex: createSourceNodeIndex('{function:selected}')
			}),
			undefined,
			'/workspace/src/b.ts'
		)

		expect(nodeID).toBe('node-b')
	})

	it('falls back to identifier matching when id match is unavailable', () => {
		// If IDs differ (runtime mismatch), identifier matching is used as fallback.
		const graph = createGraph()
		graph.sourceNodes.set(
			'candidate-1',
			createGraphNode({
				id: toGraphNodeID(100),
				sourceNodeIndex: createSourceNodeIndex('{function:fallback}')
			})
		)

		const nodeID = resolveCurrentFunctionGraphNodeID(
			graph.asGraph(),
			asCurrentFunctionLike({
				id: toGraphNodeID(999),
				sourceNodeIndex: createSourceNodeIndex('{function:fallback}')
			}),
			undefined,
			undefined
		)

		expect(nodeID).toBe('candidate-1')
	})

	it('returns caller node ids from selected edge direction', () => {
		// Incoming/outgoing edge selection is controlled by the direction argument.
		const graph = createGraph()
		graph.incomingEdges.set(
			toSourceNodeGraphNodeID('1:10'),
			new Map([
				[toSourceNodeGraphNodeID('1:11'), true],
				[toSourceNodeGraphNodeID('1:12'), true]
			])
		)
		graph.outgoingEdges.set(
			toSourceNodeGraphNodeID('1:10'),
			new Map([[toSourceNodeGraphNodeID('1:13'), true]])
		)

		expect(
			getCallerNodeIDsForCurrentNode(
				graph.asGraph(),
				toSourceNodeGraphNodeID('1:10'),
				'incoming'
			)
		).toEqual(['1:11', '1:12'])
		expect(
			getCallerNodeIDsForCurrentNode(
				graph.asGraph(),
				toSourceNodeGraphNodeID('1:10'),
				'outgoing'
			)
		).toEqual(['1:13'])
		expect(
			getCallerNodeIDsForCurrentNode(graph.asGraph(), undefined, 'outgoing')
		).toEqual([])
	})

	it('builds foreign references excluding self, non-functions, and duplicates', () => {
		// Only unique, function-like caller references should survive filtering.
		const graph = createGraph()
		graph.sourceNodes.set(
			toSourceNodeGraphNodeID('1:10'),
			createGraphNode({
				sourceNodeIndex: createSourceNodeIndex(
					'{function:current}',
					'src/current.ts'
				)
			})
		)
		graph.sourceNodes.set(
			toSourceNodeGraphNodeID('1:11'),
			createGraphNode({
				sourceNodeIndex: createSourceNodeIndex(
					'{function:callerA}',
					'src/caller-a.ts'
				)
			})
		)
		graph.sourceNodes.set(
			toSourceNodeGraphNodeID('1:12'),
			createGraphNode({
				sourceNodeIndex: createSourceNodeIndex(
					'{function:callerA}',
					'src/caller-a-dup.ts'
				)
			})
		)
		graph.sourceNodes.set(
			toSourceNodeGraphNodeID('1:13'),
			createGraphNode({
				sourceNodeIndex: createSourceNodeIndex(
					'{scope:(if:1)}',
					'src/conditional.ts'
				),
				globalIdentifier: () => createGlobalIdentifier('{scope:(if:1)}')
			})
		)
		graph.sourceNodes.set(
			toSourceNodeGraphNodeID('1:14'),
			createGraphNode({
				sourceNodeIndex: createSourceNodeIndex('{function:callerNoPath}')
			})
		)

		const result = buildForeignReferences(
			graph.asGraph(),
			toSourceNodeGraphNodeID('1:10'),
			['1:10', '1:11', '1:12', '1:13', '1:14'],
			undefined
		)

		expect(result).toHaveLength(2)
		expect(result[0]?.identifier).toBe('{function:callerA}')
		expect(result[0]?.isNavigable).toBe(true)
		expect(result[1]?.identifier).toBe('{function:callerNoPath}')
		expect(result[1]?.isNavigable).toBe(false)
	})

	it('treats global identifier fallback field as function-like when filtering callers', () => {
		const graph = createGraph()
		graph.sourceNodes.set(
			toSourceNodeGraphNodeID('1:20'),
			createGraphNode({
				sourceNodeIndex: createSourceNodeIndex('{function:current}')
			})
		)
		graph.sourceNodes.set(
			toSourceNodeGraphNodeID('1:21'),
			createGraphNode({
				sourceNodeIndex: {
					pathIndex: {
						identifier: toSourcePathIdentifier('src/global-caller.ts')
					}
				} as unknown as GraphNode['sourceNodeIndex'],
				globalIdentifier: () =>
					createGlobalIdentifier('{function:callerViaGlobalIdentifier}')
			})
		)

		const result = buildForeignReferences(
			graph.asGraph(),
			toSourceNodeGraphNodeID('1:20'),
			['1:21'],
			undefined
		)

		expect(result).toHaveLength(1)
		expect(result[0]?.isNavigable).toBe(false)
	})
})
