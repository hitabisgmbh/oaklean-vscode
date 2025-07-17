import {
	LangInternalPath_string,
	SensorValues,
	SourceFileMetaData,
	SourceNodeIdentifier_string,
	SourceNodeIndex,
	UnifiedPath_string,
	SourceNodeIndexType,
	SourceNodeIdentifierPart_string
} from '@oaklean/profiler-core'

import { Method as IMethod } from '../types/method'
export class Method implements IMethod {
	sensorValues: SensorValues
	sourceNodeIdentifierPart: SourceNodeIdentifierPart_string
	identifier: SourceNodeIdentifier_string
	parentIdentifier: SourceNodeIdentifier_string
	functionCounter = 0
	constructor(
		sensorValues: SensorValues,
		identifier: SourceNodeIdentifier_string,
		parentIdentifier: SourceNodeIdentifier_string,
		sourceNodeIdentifierPart: SourceNodeIdentifierPart_string,
		functionCounter: number
	) {
		this.sensorValues = sensorValues
		this.identifier = identifier
		this.parentIdentifier = parentIdentifier
		this.sourceNodeIdentifierPart = sourceNodeIdentifierPart
		this.functionCounter = functionCounter
	}
}

export class MethodList {
	path: UnifiedPath_string | LangInternalPath_string | ''
	methods: Method[] = []
	lastCnt: number
	constructor(sourceFileMetaData: SourceFileMetaData, lastCnt: number) {
		this.lastCnt = lastCnt
		this.path = sourceFileMetaData.path

		if (sourceFileMetaData.pathIndex.file !== undefined) {
			for (const sourceNodeIndex of sourceFileMetaData.pathIndex.file.values()) {
				this.createMethodElement(sourceNodeIndex, sourceFileMetaData)
			}
		}
	}

	createMethodElement(
		sourceNodeIndex: SourceNodeIndex<SourceNodeIndexType>,
		sourceFileMetaData: SourceFileMetaData
	) {
		if (sourceNodeIndex.children === undefined) {
			return
		}

		for (const [
			sourceNodeIdentifierPart,
			sourceNodeIndex_child
		] of sourceNodeIndex.children.entries()) {
			if (!sourceNodeIndex_child.presentInOriginalSourceCode) {
				continue
			}
			const id = sourceNodeIndex_child.id
			if (id !== undefined) {
				const functionsSourceFileMetaData = sourceFileMetaData.functions.get(id)
				if (functionsSourceFileMetaData !== undefined) {
					const sensorValues = functionsSourceFileMetaData.sensorValues
					this.lastCnt += 1
					const method = new Method(
						sensorValues,
						sourceNodeIndex_child.identifier,
						sourceNodeIndex.identifier,
						sourceNodeIdentifierPart,
						this.lastCnt
					)
					this.methods.push(method)
				}
			}
			this.createMethodElement(sourceNodeIndex_child, sourceFileMetaData)
		}
	}
}
