import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	jest
} from '@jest/globals'
import { UnifiedPath } from '@oaklean/profiler-core'

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

// Cast helper to keep IDs readable in tests without leaking real profiler internals.
function toGraphNodeID(id: number): GraphNodeID {
	return id as unknown as GraphNodeID
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
		asShape() {
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
			}
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
		// Accept valid API-shaped objects and reject incomplete runtime shapes.
		const graph = createGraph().asShape()
		expect(isSourceNodeGraphLike(graph)).toBe(true)
		expect(isSourceNodeGraphLike(undefined)).toBe(false)
		expect(isSourceNodeGraphLike({ sourceNodes: {} })).toBe(false)
	})

	it('resolves current node by id and disambiguates by current file path', () => {
		// Two nodes share id+identifier; current editor file path should pick the right one.
		const graph = createGraph()
		graph.sourceNodes.set('node-a', {
			id: toGraphNodeID(1),
			sourceNodeIndex: {
				identifier: '{function:selected}',
				pathIndex: { identifier: './src/a.ts' }
			}
		})
		graph.sourceNodes.set('node-b', {
			id: toGraphNodeID(1),
			sourceNodeIndex: {
				identifier: '{function:selected}',
				pathIndex: { identifier: './src/b.ts' }
			}
		})

		jest
			.spyOn(WorkspaceUtils, 'getRelativeWorkspacePath')
			.mockReturnValue(new UnifiedPath('./src/b.ts'))

		const nodeID = resolveCurrentFunctionGraphNodeID(
			graph.asShape(),
			{
				id: toGraphNodeID(1),
				sourceNodeIndex: { identifier: '{function:selected}' }
			},
			undefined,
			'/workspace/src/b.ts'
		)

		expect(nodeID).toBe('node-b')
	})

	it('falls back to identifier matching when id match is unavailable', () => {
		// If IDs differ (runtime mismatch), identifier matching is used as fallback.
		const graph = createGraph()
		graph.sourceNodes.set('candidate-1', {
			id: toGraphNodeID(100),
			sourceNodeIndex: { identifier: '{function:fallback}' }
		})

		const nodeID = resolveCurrentFunctionGraphNodeID(
			graph.asShape(),
			{
				id: toGraphNodeID(999),
				sourceNodeIndex: { identifier: '{function:fallback}' }
			},
			undefined,
			undefined
		)

		expect(nodeID).toBe('candidate-1')
	})

	it('returns caller node ids from selected edge direction', () => {
		// Incoming/outgoing edge selection is controlled by the direction argument.
		const graph = createGraph()
		graph.incomingEdges.set(
			'current',
			new Map([
				['inc-1', true],
				['inc-2', true]
			])
		)
		graph.outgoingEdges.set('current', new Map([['out-1', true]]))

		expect(
			getCallerNodeIDsForCurrentNode(graph.asShape(), 'current', 'incoming')
		).toEqual(['inc-1', 'inc-2'])
		expect(
			getCallerNodeIDsForCurrentNode(graph.asShape(), 'current', 'outgoing')
		).toEqual(['out-1'])
		expect(
			getCallerNodeIDsForCurrentNode(graph.asShape(), undefined, 'outgoing')
		).toEqual([])
	})

	it('builds foreign references excluding self, non-functions, and duplicates', () => {
		// Only unique, function-like caller references should survive filtering.
		const graph = createGraph()
		graph.sourceNodes.set('current', {
			sourceNodeIndex: {
				identifier: '{function:current}',
				pathIndex: { identifier: 'src/current.ts' }
			}
		})
		graph.sourceNodes.set('caller-a', {
			sourceNodeIndex: {
				identifier: '{function:callerA}',
				pathIndex: { identifier: 'src/caller-a.ts' }
			}
		})
		graph.sourceNodes.set('caller-a-dup', {
			sourceNodeIndex: {
				identifier: '{function:callerA}',
				pathIndex: { identifier: 'src/caller-a-dup.ts' }
			}
		})
		graph.sourceNodes.set('not-a-function', {
			sourceNodeIndex: {
				identifier: '{scope:(if:1)}',
				pathIndex: { identifier: 'src/conditional.ts' }
			}
		})
		graph.sourceNodes.set('caller-no-path', {
			sourceNodeIndex: {
				identifier: '{function:callerNoPath}'
			}
		})

		const result = buildForeignReferences(
			graph.asShape(),
			'current',
			[
				'current',
				'caller-a',
				'caller-a-dup',
				'not-a-function',
				'caller-no-path'
			],
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
		graph.sourceNodes.set('current', {
			sourceNodeIndex: {
				identifier: '{function:current}'
			}
		})
		graph.sourceNodes.set('caller-via-global-identifier', {
			sourceNodeIndex: {
				pathIndex: { identifier: 'src/global-caller.ts' }
			},
			globalIdentifier: () => ({
				identifier: '{function:callerViaGlobalIdentifier}'
			})
		})

		const result = buildForeignReferences(
			graph.asShape(),
			'current',
			['caller-via-global-identifier'],
			undefined
		)

		expect(result).toHaveLength(1)
		expect(result[0]?.isNavigable).toBe(false)
	})
})
