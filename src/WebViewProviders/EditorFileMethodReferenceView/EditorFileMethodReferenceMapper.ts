import path from 'path'

import { SourceNodeIdentifierHelper } from '@oaklean/profiler-core'
import {
	SourceNodeID_number,
	SourceNodeIdentifier_string,
	UnifiedPath_string
} from '@oaklean/profiler-core/dist/src/types'

import WorkspaceUtils from '../../helper/WorkspaceUtils'
import { FunctionEntry } from '../../protocols/EditorFileMethodReferenceViewProtocol'

type SensorValuesLike = {
	aggregatedCPUTime?: number
	selfCPUTime?: number
	aggregatedCPUEnergyConsumption?: number
	selfCPUEnergyConsumption?: number
	aggregatedRAMEnergyConsumption?: number
}

type SourceNodeIndexLike = {
	identifier?: SourceNodeIdentifier_string
	globalIdentifier?: () => { identifier?: SourceNodeIdentifier_string } | undefined
	pathIndex?: { identifier?: string }
	presentInOriginalSourceCode?: boolean
}

type JsonMetaLike = {
	methodName?: string
	filePath?: string
}

type ReferenceMetaLike = {
	id?: SourceNodeID_number
	methodName?: string
	sourceNodeIndex?: SourceNodeIndexLike
	sensorValues?: SensorValuesLike
	getSourceNodeIndexByID?: (id: SourceNodeID_number) => SourceNodeIndexLike | undefined
	toJSON?: () => JsonMetaLike | undefined
}

type ProjectReportLike = {
	globalIndex?: {
		getSourceNodeIndexByID?: (id: SourceNodeID_number) => SourceNodeIndexLike | undefined
	}
}

// Generic object guard reused by all runtime-shape checks in this file.
function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object'
}

function isReferenceMetaLike(value: unknown): value is ReferenceMetaLike {
	return isRecord(value)
}

function isProjectReportLike(value: unknown): value is ProjectReportLike {
	if (!isRecord(value)) {
		return false
	}
	const globalIndex = value.globalIndex
	if (globalIndex === undefined) {
		return true
	}
	if (!isRecord(globalIndex)) {
		return false
	}
	return (
		globalIndex.getSourceNodeIndexByID === undefined ||
		typeof globalIndex.getSourceNodeIndexByID === 'function'
	)
}

function isIterableUnknown(value: unknown): value is Iterable<unknown> {
	if (!isRecord(value)) {
		return false
	}
	return typeof Reflect.get(value, Symbol.iterator) === 'function'
}

// Extract human-readable function/method name from source-node identifier.
// Returns empty string on invalid/malformed identifiers by design.
export function getDisplayName(identifier: string): string {
	const sourceNodeIdentifier = toSourceNodeIdentifier(identifier)
	if (sourceNodeIdentifier === undefined) {
		return ''
	}
	try {
		const parts = SourceNodeIdentifierHelper.split(sourceNodeIdentifier)
		if (parts.length === 0) {
			return ''
		}
		const lastPart = parts[parts.length - 1]
		if (lastPart === undefined) {
			return ''
		}
		const parsed = SourceNodeIdentifierHelper.parseSourceNodeIdentifierPart(lastPart)
		return parsed?.name ?? ''
	} catch {
		return ''
	}
}

// Runtime validator + narrower for profiler identifier strings.
// We parse once to guarantee the returned value is safe for downstream helper calls.
export function toSourceNodeIdentifier(
	value: string | undefined
): SourceNodeIdentifier_string | undefined {
	if (value === undefined || value.length === 0) {
		return undefined
	}
	try {
		SourceNodeIdentifierHelper.split(value as SourceNodeIdentifier_string)
		return value as SourceNodeIdentifier_string
	} catch {
		return undefined
	}
}

// Unified path strings are contract types in profiler APIs; this narrows plain strings.
export function toUnifiedPathString(value: string): UnifiedPath_string | undefined {
	if (value.length === 0) {
		return undefined
	}
	return value as UnifiedPath_string
}

// Normalize multiple runtime collection shapes (Map-like, entries-like, plain object)
// into a flat array of reference metadata objects.
export function toMetas(ref: unknown): unknown[] {
	// Shape 1: values() iterator, potentially yielding [key, value] tuples.
	if (isRecord(ref) && typeof ref.values === 'function') {
		const result: unknown[] = []
		const valuesResult = ref.values()
		if (!isIterableUnknown(valuesResult)) {
			return result
		}
		for (const item of valuesResult) {
			if (Array.isArray(item) && item.length === 2) {
				if (isReferenceMetaLike(item[1])) {
					result.push(item[1])
				}
			} else if (isReferenceMetaLike(item)) {
				result.push(item)
			}
		}
		return result
	}

	// Shape 2: entries() iterator yielding [key, value].
	if (isRecord(ref) && typeof ref.entries === 'function') {
		const result: unknown[] = []
		const entriesResult = ref.entries()
		if (!isIterableUnknown(entriesResult)) {
			return result
		}
		for (const entry of entriesResult) {
			if (Array.isArray(entry) && entry.length === 2 && isReferenceMetaLike(entry[1])) {
				result.push(entry[1])
			}
		}
		return result
	}

	// Shape 3: plain object map.
	if (ref !== null && typeof ref === 'object') {
		const result: unknown[] = []
		for (const value of Object.values(ref)) {
			if (isReferenceMetaLike(value)) {
				result.push(value)
			}
		}
		return result
	}
	return []
}

// Convert profiler metadata objects into webview protocol entries with robust fallbacks
// for name, identifier, measurements, and relative path.
export function buildReferenceEntry(
	metaLike: unknown,
	projectReportLike: unknown
): FunctionEntry | undefined {
	if (!isReferenceMetaLike(metaLike)) {
		return undefined
	}
	const meta = metaLike

	// Primary identifier source.
	const identifier = meta.sourceNodeIndex?.identifier

	// Fallback 1: global identifier from local source-node index.
	const globalIdentifier =
		typeof meta.sourceNodeIndex?.globalIdentifier === 'function'
			? meta.sourceNodeIndex.globalIdentifier()?.identifier
			: undefined

	// Fallback 2: resolve index by id in current meta scope.
	const resolvedIndex =
		typeof meta.getSourceNodeIndexByID === 'function' && meta.id !== undefined
			? meta.getSourceNodeIndexByID(meta.id)
			: undefined

	const resolvedIdentifier =
		typeof resolvedIndex?.globalIdentifier === 'function'
			? resolvedIndex.globalIdentifier()?.identifier
			: resolvedIndex?.identifier

	// Fallback 3: resolve via project global index.
	const projectReport =
		isProjectReportLike(projectReportLike) ? projectReportLike : undefined
	const globalIndexEntry =
		meta.id !== undefined && projectReport?.globalIndex?.getSourceNodeIndexByID
			? projectReport.globalIndex.getSourceNodeIndexByID(meta.id)
			: undefined
	const globalIndexIdentifier =
		globalIndexEntry !== undefined
			? globalIndexEntry.globalIdentifier?.()?.identifier ??
				globalIndexEntry.identifier
			: undefined
	const globalIndexSourceNodeIdentifier = toSourceNodeIdentifier(globalIndexIdentifier)

	// Optional JSON projection used for display/path fallbacks.
	const json = typeof meta.toJSON === 'function' ? meta.toJSON() : undefined
	const jsonName =
		json?.methodName ??
		(json?.filePath ? path.basename(json.filePath) : '')

	// Final identifier used for navigation and preferred display label.
	const finalIdentifier =
		identifier ??
		globalIdentifier ??
		resolvedIdentifier ??
		globalIndexSourceNodeIdentifier

	const toNonEmptyName = (value: string | undefined): string | undefined =>
		value !== undefined && value.length > 0 ? value : undefined

	// Keep display-name resolution independent for each fallback source.
	// This prevents one malformed identifier from suppressing all name fallbacks.
	// Human-readable method name with robust fallback chain.
	const nameFromFinalIdentifier = toNonEmptyName(
		finalIdentifier === undefined ? undefined : getDisplayName(finalIdentifier)
	)
	const nameFromGlobalIdentifier = toNonEmptyName(
		globalIdentifier === undefined ? undefined : getDisplayName(globalIdentifier)
	)
	const nameFromResolvedIdentifier = toNonEmptyName(
		resolvedIdentifier === undefined ? undefined : getDisplayName(resolvedIdentifier)
	)
	const nameFromGlobalIndexIdentifier =
		globalIndexSourceNodeIdentifier === undefined
			? undefined
			: toNonEmptyName(getDisplayName(globalIndexSourceNodeIdentifier))
	const normalizedJsonName = toNonEmptyName(jsonName)
	const normalizedMethodName = toNonEmptyName(meta.methodName)
	const name =
		nameFromFinalIdentifier ??
		nameFromGlobalIdentifier ??
		nameFromResolvedIdentifier ??
		nameFromGlobalIndexIdentifier ??
		normalizedJsonName ??
		normalizedMethodName ??
		''

	// CPU and energy values; prefer aggregated values where available.
	const cpuTime = meta.sensorValues?.aggregatedCPUTime ?? meta.sensorValues?.selfCPUTime
	const cpuEnergy =
		meta.sensorValues?.aggregatedCPUEnergyConsumption ??
		meta.sensorValues?.selfCPUEnergyConsumption
	const ramEnergy = meta.sensorValues?.aggregatedRAMEnergyConsumption

	// Path source 1: json filePath converted to workspace-relative format.
	const filePath = typeof json?.filePath === 'string' ? json.filePath : undefined
	const relativePathFromMeta =
		filePath === undefined
			? undefined
			: WorkspaceUtils.getRelativeWorkspacePath(filePath)?.toString()

	// Path source 2/3: direct index path identifiers from resolved indexes.
	const relativePathFromIndex =
		meta.sourceNodeIndex?.pathIndex?.identifier ??
		resolvedIndex?.pathIndex?.identifier ??
		globalIndexEntry?.pathIndex?.identifier

	// Final path used for navigation payload.
	const relativePath = relativePathFromMeta ?? relativePathFromIndex
	// Track runtime-only nodes so the webview can optionally filter them out.
	const presentInOriginalSourceCode =
		meta.sourceNodeIndex?.presentInOriginalSourceCode ??
		resolvedIndex?.presentInOriginalSourceCode ??
		globalIndexEntry?.presentInOriginalSourceCode

	return {
		name,
		cpuTime,
		cpuEnergy,
		ramEnergy,
		identifier: finalIdentifier,
		relativePath,
		notPresentInOriginalSourceCode: presentInOriginalSourceCode === false
	}
}
