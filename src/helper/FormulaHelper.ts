// import vscode from 'vscode'
import * as math from 'mathjs'
import { ISensorValues } from '@oaklean/profiler-core/dist/src/types'

import { SensorValueTypeNames } from '../types/sensorValues'
import { SensorValueRepresentation } from '../types/sensorValueRepresentation'

let vscode: any
if (typeof process !== 'undefined' && process !== undefined && process.env.RUNNING_IN_EXTENSION) {
	vscode = import('vscode')
}

function deconstructFormula(sensorValues: ISensorValues, formula: string | undefined): string {
	const variablePattern = /[a-zA-Z]+/g
	if (!formula) {
		return ''
	}
	const valid = checkFormulaValidity(formula)
	if (valid) {
		const variables = formula.match(variablePattern)
		const values: Record<string, any> = {}

		if (variables !== null) {
			for (const variable of variables as (keyof ISensorValues)[]) {
				const value = returnSensorValue(sensorValues, variable)
				values[variable] = value
			}
		}
		const replacedFormula = formula.replace(variablePattern, (match) => {
			const variableValue = returnSensorValue(sensorValues, match as keyof ISensorValues)
			return variableValue !== undefined ? variableValue.toString() : match
		})

		return replacedFormula
	} else {
		return ''
	}
}

function returnSensorValue(sensorValues: ISensorValues, sensorValueName: keyof ISensorValues) {
	const value = sensorValues[sensorValueName] || 0 // Default to 0 if the value is undefined
	return value
}

export function calcOrReturnSensorValue(
	sensorValues: ISensorValues,
	sensorValueRepresentation: SensorValueRepresentation,
): number {
	let result = 0
	const { selectedSensorValueType, formula } = sensorValueRepresentation

	if (selectedSensorValueType === 'customFormula' && formula) {
		const assembledFormula = deconstructFormula(sensorValues, formula)
		if (!assembledFormula) {
			throw new Error('assembledFormula is wrong')
		}
		result = math.evaluate(assembledFormula)
	} else {
		result = returnSensorValue(sensorValues, selectedSensorValueType as keyof ISensorValues)
	}
	return result
}

export function checkFormulaValidity(formula: string | undefined): boolean {
	const variablePattern = /[a-zA-Z]+/g
	if (!formula) {
		return false
	}
	const variables = formula.match(variablePattern)
	const undefinedValues = []
	if (variables !== null) {
		for (const variable of variables) {
			if (SensorValueTypeNames[variable as keyof typeof SensorValueTypeNames] === undefined) {
				undefinedValues.push(variable)
			}
		}
	} else {
		console.debug('No variables found.')
	}

	if (undefinedValues.length > 0) {
		if (vscode !== undefined) {
			vscode.window.showErrorMessage(`There are no sensor values for the variables: ${undefinedValues.join(', ')}.`)
		}

		return false
	} else {
		return true
	}
}