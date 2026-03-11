import {
	SourceNodeID_number,
	SourceNodeIdentifier_string
} from '@oaklean/profiler-core'

import { isRecord } from '../helper/typeGuards'

export { isRecord }

// Minimal sensor subset used to render measurement values in the reference list.
export type SensorValuesLike = {
	aggregatedCPUTime?: number
	selfCPUTime?: number
	aggregatedCPUEnergyConsumption?: number
	selfCPUEnergyConsumption?: number
	aggregatedRAMEnergyConsumption?: number
}

// Minimal source-node index subset required for display + navigation fallback resolution.
export type SourceNodeIndexLike = {
	identifier?: SourceNodeIdentifier_string
	globalIdentifier?: () =>
		| { identifier?: SourceNodeIdentifier_string }
		| undefined
	pathIndex?: { identifier?: string }
	presentInOriginalSourceCode?: boolean
}

// JSON projection we read from profiler metadata objects.
export type JsonMetaLike = {
	methodName?: string
	filePath?: string
}

// Runtime shape of one reference entry from profiler metadata.
export type ReferenceMetaLike = {
	id?: SourceNodeID_number
	methodName?: string
	sourceNodeIndex?: SourceNodeIndexLike
	sensorValues?: SensorValuesLike
	lang_internal?: unknown
	intern?: unknown
	extern?: unknown
	getSourceNodeIndexByID?: (
		id: SourceNodeID_number
	) => SourceNodeIndexLike | undefined
	toJSON?: () => JsonMetaLike | undefined
}

// Runtime API shape for the function collection in SourceFileMetaData.
export type SourceFileFunctionsLike = {
	values: () => IterableIterator<ReferenceMetaLike>
	entries: () => Iterator<[unknown, ReferenceMetaLike]>
	get: (id: SourceNodeID_number) => ReferenceMetaLike | undefined
}

// Minimal SourceFileMetaData shape needed by this provider.
export type SourceFileMetaDataLike = {
	functions: SourceFileFunctionsLike
}

// Lightweight guard: we only need object semantics for reference entries.
export function isReferenceMetaLike(
	value: unknown
): value is ReferenceMetaLike {
	return isRecord(value)
}

// Ensures SourceFileMetaData has the functions API this provider depends on.
export function isSourceFileMetaDataLike(
	value: unknown
): value is SourceFileMetaDataLike {
	if (!isRecord(value)) {
		return false
	}
	const functions = value.functions
	if (!isRecord(functions)) {
		return false
	}
	return (
		typeof functions.values === 'function' &&
		typeof functions.entries === 'function' &&
		typeof functions.get === 'function'
	)
}
