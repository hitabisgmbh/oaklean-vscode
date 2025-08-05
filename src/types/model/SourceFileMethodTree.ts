import {
	ISourceNodeMetaData,
	SourceNodeIdentifierPart_string,
	SourceNodeMetaDataType,
} from '@oaklean/profiler-core/dist/src/types'

export type ISourceFileMethodTree = {
	sourceNodeMetaData?: ISourceNodeMetaData<
		| SourceNodeMetaDataType.SourceNode
		| SourceNodeMetaDataType.LangInternalSourceNode
	>
	piosc?: true
	pioscChildrenCount: number
	children: Record<SourceNodeIdentifierPart_string, ISourceFileMethodTree>
}