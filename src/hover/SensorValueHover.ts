import * as vscode from 'vscode'
import { SensorValues } from '@oaklean/profiler-core'

import { SensorValueTypeNames, UnitPerSensorValue, ExtendedSensorValueType } from '../types/sensorValues'
import { calcOrReturnSensorValue } from '../helper/FormulaHelper'

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

		for (const [sensorValueType, sensorValueName] of Object.entries(SensorValueTypeNames)) {
			const unit = UnitPerSensorValue[sensorValueType as ExtendedSensorValueType]
			if (sensorValueType === 'customFormula') {
				if (this.formula){
					const calculatedFormula = calcOrReturnSensorValue(this.sensorValues, sensorValueName, this.formula)
					contents.appendMarkdown(
						`|${this.formula}|${calculatedFormula}| \n`
					)	
				}
			} else {
				contents.appendMarkdown(
					`|${sensorValueName}|${this.sensorValues[sensorValueType]}|${unit}| \n`
				)
			}
		}
		return new vscode.Hover(contents)
	}
}