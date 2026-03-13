import path from 'path'

import {
	SourceNodeIdentifierHelper,
	SourceNodeIdentifier_string,
	UnifiedPath_string
} from '@oaklean/profiler-core'
import type { ProjectReport } from '@oaklean/profiler-core'

import { isRecord } from '../../helper/typeGuards'
import WorkspaceUtils from '../../helper/WorkspaceUtils'
import { FunctionEntry } from '../../protocols/EditorFileMethodReferenceViewProtocol'
import {
	isReferenceMetaLike,
	JsonMetaLike,
	ReferenceMetaLike,
	SourceNodeIndexLike
} from '../../types/EditorFileMethodReferenceViewTypes'

function isIterableUnknown(value: unknown): value is Iterable<unknown> {
	if (!isRecord(value)) {
		return false
	}
	return typeof Reflect.get(value, Symbol.iterator) === 'function'
}

function toNonEmptyName(value: string | undefined): string | undefined {
	return value !== undefined && value.length > 0 ? value : undefined
}

function toJsonMetaLike(value: unknown): JsonMetaLike | undefined {
	if (!isRecord(value)) {
		return undefined
	}
	return {
		methodName:
			typeof value.methodName === 'string' ? value.methodName : undefined,
		filePath: typeof value.filePath === 'string' ? value.filePath : undefined
	}
}

type IdentifierResolution = {
	finalIdentifier: string | undefined
	globalIdentifier: string | undefined
	resolvedIdentifier: string | undefined
	globalIndexSourceNodeIdentifier: SourceNodeIdentifier_string | undefined
	resolvedIndex: SourceNodeIndexLike | undefined
	globalIndexEntry: SourceNodeIndexLike | undefined
}

function resolveIdentifiers(
	meta: ReferenceMetaLike,
	projectReport: ProjectReport | undefined
): IdentifierResolution {
	const identifier = meta.sourceNodeIndex?.identifier
	const globalIdentifier =
		typeof meta.sourceNodeIndex?.globalIdentifier === 'function'
			? meta.sourceNodeIndex.globalIdentifier()?.identifier
			: undefined

	const resolvedIndex =
		typeof meta.getSourceNodeIndexByID === 'function' && meta.id !== undefined
			? meta.getSourceNodeIndexByID(meta.id)
			: undefined

	const resolvedIdentifier =
		typeof resolvedIndex?.globalIdentifier === 'function'
			? resolvedIndex.globalIdentifier()?.identifier
			: resolvedIndex?.identifier

	const globalIndexEntry =
		meta.id !== undefined && projectReport?.globalIndex?.getSourceNodeIndexByID
			? projectReport.globalIndex.getSourceNodeIndexByID(meta.id)
			: undefined
	const globalIndexIdentifier =
		globalIndexEntry !== undefined
			? (globalIndexEntry.globalIdentifier?.()?.identifier ??
				globalIndexEntry.identifier)
			: undefined
	const globalIndexSourceNodeIdentifier = toSourceNodeIdentifier(
		globalIndexIdentifier
	)
	const finalIdentifier =
		identifier ??
		globalIdentifier ??
		resolvedIdentifier ??
		globalIndexSourceNodeIdentifier

	return {
		finalIdentifier,
		globalIdentifier,
		resolvedIdentifier,
		globalIndexSourceNodeIdentifier,
		resolvedIndex,
		globalIndexEntry
	}
}

function resolveName(
	meta: ReferenceMetaLike,
	jsonName: string,
	identifierResolution: IdentifierResolution
): string {
	const {
		finalIdentifier,
		globalIdentifier,
		resolvedIdentifier,
		globalIndexSourceNodeIdentifier
	} = identifierResolution

	const finalSourceNodeIdentifier = toSourceNodeIdentifier(finalIdentifier)
	if (finalSourceNodeIdentifier !== undefined) {
		const nameFromFinalIdentifier = toNonEmptyName(
			getDisplayName(finalSourceNodeIdentifier)
		)
		if (nameFromFinalIdentifier !== undefined) {
			return nameFromFinalIdentifier
		}
	}

	const globalSourceNodeIdentifier = toSourceNodeIdentifier(globalIdentifier)
	if (globalSourceNodeIdentifier !== undefined) {
		const nameFromGlobalIdentifier = toNonEmptyName(
			getDisplayName(globalSourceNodeIdentifier)
		)
		if (nameFromGlobalIdentifier !== undefined) {
			return nameFromGlobalIdentifier
		}
	}

	const resolvedSourceNodeIdentifier =
		toSourceNodeIdentifier(resolvedIdentifier)
	if (resolvedSourceNodeIdentifier !== undefined) {
		const nameFromResolvedIdentifier = toNonEmptyName(
			getDisplayName(resolvedSourceNodeIdentifier)
		)
		if (nameFromResolvedIdentifier !== undefined) {
			return nameFromResolvedIdentifier
		}
	}

	if (globalIndexSourceNodeIdentifier !== undefined) {
		const nameFromGlobalIndexIdentifier = toNonEmptyName(
			getDisplayName(globalIndexSourceNodeIdentifier)
		)
		if (nameFromGlobalIndexIdentifier !== undefined) {
			return nameFromGlobalIndexIdentifier
		}
	}

	const normalizedJsonName = toNonEmptyName(jsonName)
	if (normalizedJsonName !== undefined) {
		return normalizedJsonName
	}

	const normalizedMethodName = toNonEmptyName(meta.methodName)
	if (normalizedMethodName !== undefined) {
		return normalizedMethodName
	}

	return ''
}

function resolveSensorValues(meta: ReferenceMetaLike): {
	cpuTime: number | undefined
	cpuEnergy: number | undefined
	ramEnergy: number | undefined
} {
	return {
		cpuTime:
			meta.sensorValues?.aggregatedCPUTime ?? meta.sensorValues?.selfCPUTime,
		cpuEnergy:
			meta.sensorValues?.aggregatedCPUEnergyConsumption ??
			meta.sensorValues?.selfCPUEnergyConsumption,
		ramEnergy: meta.sensorValues?.aggregatedRAMEnergyConsumption
	}
}

function resolveRelativePath(
	meta: ReferenceMetaLike,
	json: JsonMetaLike | undefined,
	resolvedIndex: SourceNodeIndexLike | undefined,
	globalIndexEntry: SourceNodeIndexLike | undefined
): string | undefined {
	const filePath =
		typeof json?.filePath === 'string' ? json.filePath : undefined
	const relativePathFromMeta =
		filePath === undefined
			? undefined
			: WorkspaceUtils.getRelativeWorkspacePath(filePath)?.toString()
	const relativePathFromIndex =
		meta.sourceNodeIndex?.pathIndex?.identifier ??
		resolvedIndex?.pathIndex?.identifier ??
		globalIndexEntry?.pathIndex?.identifier
	return relativePathFromMeta ?? relativePathFromIndex
}

function resolveNotPresentInOriginalSourceCode(
	meta: ReferenceMetaLike,
	resolvedIndex: SourceNodeIndexLike | undefined,
	globalIndexEntry: SourceNodeIndexLike | undefined
): boolean {
	const presentInOriginalSourceCode =
		meta.sourceNodeIndex?.presentInOriginalSourceCode ??
		resolvedIndex?.presentInOriginalSourceCode ??
		globalIndexEntry?.presentInOriginalSourceCode
	return presentInOriginalSourceCode === false
}

// Extract human-readable function/method name from source-node identifier.
// Returns empty string on invalid/malformed identifiers by design.
export function getDisplayName(
	identifier: SourceNodeIdentifier_string
): string {
	try {
		const parts = SourceNodeIdentifierHelper.split(identifier)
		if (parts.length === 0) {
			return ''
		}
		const lastPart = parts[parts.length - 1]
		if (lastPart === undefined) {
			return ''
		}
		const parsed =
			SourceNodeIdentifierHelper.parseSourceNodeIdentifierPart(lastPart)
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
export function toUnifiedPathString(
	value: string
): UnifiedPath_string | undefined {
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
			if (
				Array.isArray(entry) &&
				entry.length === 2 &&
				isReferenceMetaLike(entry[1])
			) {
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
	projectReport: ProjectReport | undefined
): FunctionEntry | undefined {
	if (!isReferenceMetaLike(metaLike)) {
		return undefined
	}
	const meta = metaLike

	// Optional JSON projection used for display/path fallbacks.
	const json = toJsonMetaLike(
		typeof meta.toJSON === 'function' ? meta.toJSON() : undefined
	)
	const jsonName =
		json?.methodName ?? (json?.filePath ? path.basename(json.filePath) : '')
	const identifierResolution = resolveIdentifiers(meta, projectReport)
	const { finalIdentifier, resolvedIndex, globalIndexEntry } =
		identifierResolution

	const name = resolveName(meta, jsonName, identifierResolution)
	const { cpuTime, cpuEnergy, ramEnergy } = resolveSensorValues(meta)
	const relativePath = resolveRelativePath(
		meta,
		json,
		resolvedIndex,
		globalIndexEntry
	)
	const notPresentInOriginalSourceCode = resolveNotPresentInOriginalSourceCode(
		meta,
		resolvedIndex,
		globalIndexEntry
	)

	return {
		name,
		cpuTime,
		cpuEnergy,
		ramEnergy,
		identifier: finalIdentifier,
		relativePath,
		notPresentInOriginalSourceCode
	}
}
