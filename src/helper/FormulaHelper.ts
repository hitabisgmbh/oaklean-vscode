// import vscode from 'vscode'
import * as math from 'mathjs'
import { ISensorValues } from '@oaklean/profiler-core/dist/src/types'

import { ExtendedSensorValueType, SensorValueTypeNames } from '../types/sensorValues'

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
	sensorValueName: ExtendedSensorValueType,
	formula: string | undefined
): number {
	let result = 0
	if (sensorValueName === 'customFormula' && formula) {
		const assembledFormula = deconstructFormula(sensorValues, formula)
		if (!assembledFormula) {
			throw new Error('assembledFormula is wrong')
		}
		result = math.evaluate(assembledFormula)
	} else {
		result = returnSensorValue(sensorValues, sensorValueName as keyof ISensorValues)
	}
	return result
}

export function checkFormulaValidity(formula: string | undefined): boolean {
	const variablePattern = /[a-zA-Z]+/g
	if (!formula) {
		return false
	}
	const variables = formula.match(variablePattern)
	let undefinedValues = ''
	if (variables !== null) {
		for (const variable of variables) {
			if (!(variable in SensorValueTypeNames)) {
				undefinedValues += ` ${variable},`
			}
		}
	} else {
		console.debug('No variables found.')
	}

	if (undefinedValues.length > 0) {
		const trimmedUndefinedValues = undefinedValues.slice(0, undefinedValues.length - 1)
		if (typeof process !== 'undefined' && process !== undefined && process.env.RUNNING_IN_EXTENSION) {
			vscode.window.showErrorMessage(
				`There are no sensor values for the variables: ${trimmedUndefinedValues}.`)
		}

		return false
	} else {
		return true
	}
}