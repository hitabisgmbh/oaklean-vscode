import vscode from 'vscode'
import {
	SourceNodeMetaData,
	SourceNodeMetaDataType
} from '@oaklean/profiler-core'

import { calcOrReturnSensorValue } from '../helper/FormulaHelper'
import { SensorValueFormatHelper } from '../helper/SensorValueFormatHelper'
// Types
import {
	SensorValueTypeNames,
	ExtendedSensorValueType
} from '../types/sensorValues'
import { SensorValueRepresentation } from '../types/sensorValueRepresentation'

export default class SensorValueHover {
	private sourceNodeMetaData: SourceNodeMetaData<
		| SourceNodeMetaDataType.SourceNode
		| SourceNodeMetaDataType.LangInternalSourceNode
	>
	private _sensorValueRepresentation: SensorValueRepresentation
	constructor(
		sourceNodeMetaData: SourceNodeMetaData<
			| SourceNodeMetaDataType.SourceNode
			| SourceNodeMetaDataType.LangInternalSourceNode
		>,
		sensorValueRepresentation: SensorValueRepresentation
	) {
		this._sensorValueRepresentation = sensorValueRepresentation
		this.sourceNodeMetaData = sourceNodeMetaData
	}

	provideHover(): vscode.ProviderResult<vscode.Hover> {
		const contents: vscode.MarkdownString = new vscode.MarkdownString()
		contents.appendMarkdown('|type|value|unit| \n')
		contents.appendMarkdown('|---|---|---| \n')

		for (const [sensorValueType, sensorValueName] of Object.entries(
			SensorValueTypeNames
		) as [ExtendedSensorValueType, ExtendedSensorValueType][]) {
			const sensorValue = calcOrReturnSensorValue(
				this.sourceNodeMetaData.sensorValues,
				{
					...this._sensorValueRepresentation,
					selectedSensorValueType: sensorValueType
				}
			)

			const formattedSensorValue = SensorValueFormatHelper.format(
				sensorValue,
				sensorValueType
			)

			contents.appendMarkdown(
				`|${sensorValueName}|${formattedSensorValue.value}|${formattedSensorValue.unit}| \n`
			)
		}
		return new vscode.Hover(contents)
	}
}