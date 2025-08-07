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
	static provideHover(
		sourceNodeMetaData: SourceNodeMetaData<
			| SourceNodeMetaDataType.SourceNode
			| SourceNodeMetaDataType.LangInternalSourceNode
		>,
		sensorValueRepresentation: SensorValueRepresentation
	): vscode.ProviderResult<vscode.Hover> {
		const contents: vscode.MarkdownString = new vscode.MarkdownString()
		contents.appendMarkdown('|type|value|unit| \n')
		contents.appendMarkdown('|---|---|---| \n')

		for (const [sensorValueType, sensorValueName] of Object.entries(
			SensorValueTypeNames
		) as [ExtendedSensorValueType, ExtendedSensorValueType][]) {
			const sensorValue = calcOrReturnSensorValue(
				sourceNodeMetaData.sensorValues,
				{
					...sensorValueRepresentation,
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