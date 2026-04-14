import {
	ISensorValues,
	SourceFileMetaData,
	SourceNodeIndex,
	SourceNodeIndexType,
	SourceNodeMetaData,
	SourceNodeMetaDataType
} from '@oaklean/profiler-core'

import { isRecord } from '../helper/typeGuards'

export { isRecord }

// Minimal sensor subset used to render measurement values in the reference list.
export type SensorValuesLike = Pick<
	ISensorValues,
	| 'aggregatedCPUTime'
	| 'selfCPUTime'
	| 'aggregatedCPUEnergyConsumption'
	| 'selfCPUEnergyConsumption'
	| 'aggregatedRAMEnergyConsumption'
>

// Minimal source-node index subset required for display + navigation fallback resolution.
export type SourceNodeIndexLike = Pick<
	SourceNodeIndex<SourceNodeIndexType.SourceNode>,
	| 'identifier'
	| 'globalIdentifier'
	| 'pathIndex'
	| 'presentInOriginalSourceCode'
>

// JSON projection we read from profiler metadata objects.
export type JsonMetaLike = {
	methodName?: string
	filePath?: string
}

type CoreReferenceMeta = SourceNodeMetaData<
	| SourceNodeMetaDataType.SourceNode
	| SourceNodeMetaDataType.LangInternalSourceNode
>

// Runtime shape of one reference entry from profiler metadata.
export type ReferenceMetaLike = Partial<
	Pick<
		CoreReferenceMeta,
		| 'id'
		| 'sourceNodeIndex'
		| 'sensorValues'
		| 'lang_internal'
		| 'intern'
		| 'extern'
		| 'getSourceNodeIndexByID'
		| 'toJSON'
	>
> & {
	methodName?: string
}

// Minimal SourceFileMetaData shape needed by this provider.
export type SourceFileMetaDataLike = Pick<SourceFileMetaData, 'functions'>

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
