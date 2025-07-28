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
	presentInOriginalSourceCode = false
	parent: SourceFileMethodTree | undefined
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
		sourceFileMetaData: SourceFileMetaData
	): SourceFileMethodTree {
		const root = new SourceFileMethodTree(true, '' as SourceNodeIdentifierPart_string, undefined)
		root.addSourceFileMetaData(sourceFileMetaData)
		return root
	}

	addSourceFileMetaData(
		sourceFileMetaData: SourceFileMetaData
	) {
		for (const sourceNodeMetaData of sourceFileMetaData.functions.values()) {
			const identifierParts = SourceNodeIdentifierHelper.split(
				sourceNodeMetaData.sourceNodeIndex.identifier
			)
			this.addChild(identifierParts, sourceNodeMetaData.presentInOriginalSourceCode, sourceNodeMetaData)
		}
	}

	addChild(
		identifierParts: SourceNodeIdentifierPart_string[],
		presentInOriginalSourceCode: boolean,
		sourceNodeMetaData: SourceNodeMetaData<
			| SourceNodeMetaDataType.SourceNode
			| SourceNodeMetaDataType.LangInternalSourceNode
		>,
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
			child.parent = this
			this.children.set(identifierPart, child)
		}
		if (presentInOriginalSourceCode) {
			child.presentInOriginalSourceCode = true
		}
		child.addChild(identifierParts, presentInOriginalSourceCode, sourceNodeMetaData)
	}

	toJSON(): ISourceFileMethodTree {
		const children: Record<string, ISourceFileMethodTree> = {}
		for (const [key, child] of this.children.entries()) {
			children[key] = child.toJSON()
		}
		return {
			presentInOriginalSourceCode: this.presentInOriginalSourceCode,
			sourceNodeMetaData: this.sourceNodeMetaData?.toJSON(),
			children
		}
	}
}
