import {
	SourceNodeMetaData,
	SourceNodeIdentifierPart_string,
	SourceFileMetaData,
	SourceNodeMetaDataType,
	SourceNodeIdentifierHelper
} from '@oaklean/profiler-core'

import { ISourceFileMethodTree } from '../types/model/SourceFileMethodTree'

export class SourceFileMethodTree {
	isRoot: boolean
	identifierPart: SourceNodeIdentifierPart_string
	sourceNodeMetaData?: SourceNodeMetaData<
		| SourceNodeMetaDataType.SourceNode
		| SourceNodeMetaDataType.LangInternalSourceNode
	>
	children: Map<SourceNodeIdentifierPart_string, SourceFileMethodTree>

	constructor(
		isRoot: boolean,
		identifierPart: SourceNodeIdentifierPart_string,
		sourceNodeMetaData?: SourceNodeMetaData<
			| SourceNodeMetaDataType.SourceNode
			| SourceNodeMetaDataType.LangInternalSourceNode
		>
	) {
		this.isRoot = isRoot
		this.identifierPart = identifierPart
		this.sourceNodeMetaData = sourceNodeMetaData
		this.children = new Map()
	}

	static fromSourceFileMetaData(
		sourceFileMetaData: SourceFileMetaData,
		onlyPresentInOriginalSourceCode = true
	): SourceFileMethodTree {
		const root = new SourceFileMethodTree(true, '' as SourceNodeIdentifierPart_string, undefined)
		root.addSourceFileMetaData(sourceFileMetaData, onlyPresentInOriginalSourceCode)
		return root
	}

	addSourceFileMetaData(
		sourceFileMetaData: SourceFileMetaData,
		onlyPresentInOriginalSourceCode = true
	) {
		for (const sourceNodeMetaData of sourceFileMetaData.functions.values()) {
			if (onlyPresentInOriginalSourceCode && !sourceNodeMetaData.presentInOriginalSourceCode) {
				continue
			}
			const identifierParts = SourceNodeIdentifierHelper.split(
				sourceNodeMetaData.sourceNodeIndex.identifier
			)
			this.addChild(identifierParts, sourceNodeMetaData)
		}
	}

	addChild(
		identifierParts: SourceNodeIdentifierPart_string[],
		sourceNodeMetaData?: SourceNodeMetaData<
			| SourceNodeMetaDataType.SourceNode
			| SourceNodeMetaDataType.LangInternalSourceNode
		>
	) {
		const identifierPart = identifierParts.shift()
		if (identifierPart === undefined) {
			if (sourceNodeMetaData !== undefined) {
				this.sourceNodeMetaData = sourceNodeMetaData
			}
			return
		}
		let child = this.children.get(identifierPart)
		if (child === undefined) {
			child = new SourceFileMethodTree(false, identifierPart, undefined)
			this.children.set(identifierPart, child)
		}
		child.addChild(identifierParts, sourceNodeMetaData)
	}

	toJSON(): ISourceFileMethodTree {
		const children: Record<string, ISourceFileMethodTree> = {}
		for (const [key, child] of this.children.entries()) {
			children[key] = child.toJSON()
		}
		return {
			sourceNodeMetaData: this.sourceNodeMetaData?.toJSON(),
			children
		}
	}
}
