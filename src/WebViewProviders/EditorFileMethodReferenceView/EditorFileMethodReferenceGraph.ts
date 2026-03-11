import {
	SourceNodeID_number,
	SourceNodeIdentifierHelper
} from '@oaklean/profiler-core'

import {
	buildReferenceEntry,
	toSourceNodeIdentifier
} from './EditorFileMethodReferenceMapper'

import WorkspaceUtils from '../../helper/WorkspaceUtils'
import { FunctionEntry } from '../../protocols/EditorFileMethodReferenceViewProtocol'

type SourceNodeIndexLike = {
	identifier?: string
	pathIndex?: { identifier?: string }
}

type GlobalIdentifierLike = {
	identifier?: string
	sourceNodeIdentifier?: string
}

type CurrentFunctionLike = {
	id?: SourceNodeID_number
	sourceNodeIndex?: SourceNodeIndexLike
}

type SourceGraphNodeLike = CurrentFunctionLike & {
	globalIdentifier?: () => GlobalIdentifierLike | undefined
}

type SourceNodeMapLike = {
	entries: () => IterableIterator<[string, SourceGraphNodeLike]>
	get: (key: string) => SourceGraphNodeLike | undefined
}

type NeighborNodeMapLike = {
	keys: () => IterableIterator<string>
}

type GraphEdgesLike = {
	get: (key: string) => NeighborNodeMapLike | undefined
}

export type SourceNodeGraphLike = {
	sourceNodes: SourceNodeMapLike
	incomingEdges: GraphEdgesLike
	outgoingEdges: GraphEdgesLike
}

export type CallerEdgeDirection = 'incoming' | 'outgoing'

const SOURCE_NODE_FUNCTION_TYPES = new Set([
	'FunctionDeclaration',
	'FunctionExpression',
	'MethodDefinition',
	'ConstructorDeclaration',
	'GetAccessorDeclaration',
	'SetAccessorDeclaration'
])

// Generic object guard used by all shape validators in this module.
function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object'
}

function isSourceGraphNodeLike(value: unknown): value is SourceGraphNodeLike {
	return isRecord(value)
}

function isSourceNodeMapLike(value: unknown): value is SourceNodeMapLike {
	if (!isRecord(value)) {
		return false
	}
	return typeof value.entries === 'function' && typeof value.get === 'function'
}

export function isSourceNodeGraphLike(
	value: unknown
): value is SourceNodeGraphLike {
	if (!isRecord(value)) {
		return false
	}
	return (
		isSourceNodeMapLike(value.sourceNodes) &&
		isRecord(value.incomingEdges) &&
		typeof value.incomingEdges.get === 'function' &&
		isRecord(value.outgoingEdges) &&
		typeof value.outgoingEdges.get === 'function'
	)
}

// Match strategy (in priority order):
// 1) exact metadata id match
// 2) source-node identifier match
// 3) disambiguation by current editor path
// 4) first candidate fallback
export function resolveCurrentFunctionGraphNodeID(
	sourceNodeGraph: SourceNodeGraphLike | undefined,
	currentFunction: CurrentFunctionLike,
	currentScopeIdentifier: string | undefined,
	currentEditorFileName: string | undefined
): string | undefined {
	if (sourceNodeGraph === undefined) {
		return undefined
	}

	const currentFunctionId = currentFunction.id
	const currentIdentifier =
		currentScopeIdentifier ?? currentFunction.sourceNodeIndex?.identifier
	const relativeWorkspacePath = WorkspaceUtils.getRelativeWorkspacePath(
		currentEditorFileName ?? ''
	)?.toString()

	// Single scan over graph nodes; collect candidates for both id and identifier dimensions.
	const idMatches: Array<[string, SourceGraphNodeLike]> = []
	const identifierMatches: Array<[string, SourceGraphNodeLike]> = []

	for (const [nodeID, node] of sourceNodeGraph.sourceNodes.entries()) {
		if (!isSourceGraphNodeLike(node)) {
			continue
		}
		if (
			currentFunctionId !== undefined &&
			(node.id === currentFunctionId ||
				nodeID.endsWith(`:${currentFunctionId}`))
		) {
			idMatches.push([nodeID, node])
		}
		if (
			currentIdentifier !== undefined &&
			graphNodeMatchesIdentifier(node, currentIdentifier)
		) {
			identifierMatches.push([nodeID, node])
		}
	}

	// Most stable match: source-node id from metadata.
	if (currentFunctionId !== undefined) {
		const exactMatchById = pickGraphNodeMatch(
			idMatches,
			currentIdentifier,
			relativeWorkspacePath
		)
		if (exactMatchById !== undefined) {
			return exactMatchById
		}
	}

	if (currentIdentifier === undefined) {
		return undefined
	}

	return pickGraphNodeMatch(
		identifierMatches,
		currentIdentifier,
		relativeWorkspacePath
	)
}

export function getCallerNodeIDsForCurrentNode(
	sourceNodeGraph: SourceNodeGraphLike | undefined,
	currentNodeID: string | undefined,
	callerEdgeDirection: CallerEdgeDirection
): string[] {
	if (sourceNodeGraph === undefined || currentNodeID === undefined) {
		return []
	}
	// Caller direction is configurable because graph semantics can vary by report implementation.
	const edgesByDirection = {
		incoming: sourceNodeGraph.incomingEdges,
		outgoing: sourceNodeGraph.outgoingEdges
	}
	const selectedEdges = edgesByDirection[callerEdgeDirection]
	const neighbors = selectedEdges.get(currentNodeID)
	return neighbors ? Array.from(neighbors.keys()) : []
}

export function buildForeignReferences(
	sourceNodeGraph: SourceNodeGraphLike | undefined,
	currentNodeID: string | undefined,
	callerNodeIDs: string[],
	projectReport: unknown
): FunctionEntry[] {
	if (sourceNodeGraph === undefined || currentNodeID === undefined) {
		return []
	}

	const result: FunctionEntry[] = []
	// Use identifier (or node id fallback) as stable dedupe key.
	const dedupeIdentifiers = new Set<string>()

	for (const callerNodeID of callerNodeIDs) {
		// "Functions that use this Function" must not contain the current function itself.
		if (callerNodeID === currentNodeID) {
			continue
		}
		const callerNode = sourceNodeGraph.sourceNodes.get(callerNodeID)
		if (
			!isSourceGraphNodeLike(callerNode) ||
			!isFunctionGraphNode(callerNode)
		) {
			continue
		}
		const entry = buildReferenceEntry(callerNode, projectReport)
		if (entry === undefined) {
			continue
		}

		const dedupeIdentifier = entry.identifier ?? callerNodeID
		if (dedupeIdentifiers.has(dedupeIdentifier)) {
			continue
		}
		dedupeIdentifiers.add(dedupeIdentifier)

		entry.isNavigable =
			entry.identifier !== undefined && entry.relativePath !== undefined
		result.push(entry)
	}

	return result
}

// Detect whether a graph node represents a callable/function-like source construct.
function isFunctionGraphNode(node: SourceGraphNodeLike): boolean {
	const localIdentifier = node.sourceNodeIndex?.identifier
	if (isFunctionLikeIdentifier(localIdentifier)) {
		return true
	}
	const globalIdentifier =
		typeof node.globalIdentifier === 'function'
			? node.globalIdentifier()
			: undefined
	return (
		isFunctionLikeIdentifier(globalIdentifier?.sourceNodeIdentifier) ||
		isFunctionLikeIdentifier(globalIdentifier?.identifier)
	)
}

// Identifier parser can throw on malformed values; this helper must stay fail-safe.
function isFunctionLikeIdentifier(identifier: string | undefined): boolean {
	const sourceNodeIdentifier = toSourceNodeIdentifier(identifier)
	if (sourceNodeIdentifier === undefined) {
		return false
	}
	try {
		const parts = SourceNodeIdentifierHelper.split(sourceNodeIdentifier)
		if (parts.length === 0) {
			return false
		}
		const lastPart = parts[parts.length - 1]
		const parsedType =
			SourceNodeIdentifierHelper.parseSourceNodeIdentifierPart(lastPart)?.type
		if (parsedType === undefined || parsedType === null) {
			return false
		}
		return SOURCE_NODE_FUNCTION_TYPES.has(parsedType)
	} catch {
		return false
	}
}

// Pick best node candidate with path + identifier disambiguation.
function pickGraphNodeMatch(
	candidates: Array<[string, SourceGraphNodeLike]>,
	identifier: string | undefined,
	relativeWorkspacePath: string | undefined
): string | undefined {
	if (candidates.length === 0) {
		return undefined
	}

	// Path match first to avoid selecting same identifier from a different file.
	if (relativeWorkspacePath !== undefined) {
		for (const [nodeID, node] of candidates) {
			if (
				node.sourceNodeIndex?.pathIndex?.identifier === relativeWorkspacePath
			) {
				if (
					identifier === undefined ||
					graphNodeMatchesIdentifier(node, identifier)
				) {
					return nodeID
				}
			}
		}
	}

	// Next best: any candidate with matching identifier.
	if (identifier !== undefined) {
		for (const [nodeID, node] of candidates) {
			if (graphNodeMatchesIdentifier(node, identifier)) {
				return nodeID
			}
		}
	}

	// Final fallback keeps behavior deterministic if multiple nodes are equivalent.
	return candidates[0][0]
}

// Accept both local and global identifier formats used by different report versions.
function graphNodeMatchesIdentifier(
	node: SourceGraphNodeLike,
	identifier: string
): boolean {
	if (node.sourceNodeIndex?.identifier === identifier) {
		return true
	}
	const globalIdentifier =
		typeof node.globalIdentifier === 'function'
			? node.globalIdentifier()
			: undefined
	return (
		globalIdentifier?.sourceNodeIdentifier === identifier ||
		globalIdentifier?.identifier === identifier
	)
}
