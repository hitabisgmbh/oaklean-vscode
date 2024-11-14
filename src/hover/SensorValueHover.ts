import * as vscode from 'vscode'
import { SensorValues } from '@oaklean/profiler-core'

import { SensorValueTypeNames, ExtendedSensorValueType } from '../types/sensorValues'
import { calcOrReturnSensorValue } from '../helper/FormulaHelper'
import { SensorValueFormatHelper } from '../helper/SensorValueFormatHelper'
export default class SensorValueHover {
	private sensorValues: SensorValues
	private formula: string | undefined
	constructor(sensorValues: SensorValues, formula: string | undefined) {
		this.formula = formula
		this.sensorValues = sensorValues
	}

	provideHover(): vscode.ProviderResult<vscode.Hover> {
		const contents: vscode.MarkdownString = new vscode.MarkdownString()
		contents.appendMarkdown('|type|value|unit| \n')
		contents.appendMarkdown('|---|---|---| \n')

		for (const [
			sensorValueType,
			sensorValueName
		] of Object.entries(SensorValueTypeNames) as [ExtendedSensorValueType, string][]) {
			if (sensorValueType === 'customFormula') {
				if (this.formula) {
					const calculatedFormula = calcOrReturnSensorValue(
						this.sensorValues, sensorValueName, this.formula)
					const formattedCalculatedFormula = SensorValueFormatHelper.format(
						calculatedFormula,
						sensorValueType
					)
					contents.appendMarkdown(
						`|${this.formula}|${formattedCalculatedFormula.value}| \n`
					)
				}
			} else {
				const formattedSensorValue = SensorValueFormatHelper.format(
					this.sensorValues[sensorValueType],
					sensorValueType
				)
				contents.appendMarkdown(
					`|${sensorValueName}|${formattedSensorValue.value}|${formattedSensorValue.unit}| \n`
				)
			}
		}
		return new vscode.Hover(contents)
	}
}