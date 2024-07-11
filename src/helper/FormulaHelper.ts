// import vscode from 'vscode'
import * as math from 'mathjs'

let vscode: any
if (typeof process !== 'undefined' && process !== undefined && process.env.RUNNING_IN_EXTENSION) {
	vscode = import('vscode')
}


import { SensorValueTypeNames } from '../types/sensorValues'


interface LocalSensorValues {
	[key: string]: any;
}

function deconstructFormula(sensorValues: LocalSensorValues, formula: string | undefined): string {
	const variablePattern = /[a-zA-Z]+/g
	if (!formula){
		return ''
	}
	const valid = checkFomulaValidity(formula)
	if (valid){
		const variables = formula.match(variablePattern)
		const values: Record<string, any> = {}
	
		if (variables !== null) {
			for (const variable of variables) {
				const value = returnSensorValue(sensorValues, variable)
				values[variable] = value
			}
		}
		const replacedFormula = formula.replace(variablePattern, (match) => {
			const variableValue = returnSensorValue(sensorValues, match)
			return variableValue !== undefined ? variableValue.toString() : match
		})
		
		return replacedFormula
	} else {
		return ''
	}
}

function returnSensorValue(sensorValues: LocalSensorValues, sensorValueName: string ): number {
	const value = sensorValues[sensorValueName]
	return value
}

export function calcOrReturnSensorValue(sensorValues: LocalSensorValues, 
	sensorValueName: string, formula: string | undefined): number{
	let result = 0
	if (sensorValueName === 'customFormula' && formula){
		const assembledFormula = deconstructFormula(sensorValues, formula)
		if (!assembledFormula){
			throw new Error('assembledFormula is wrong')
		}
		result = math.evaluate(assembledFormula)
	} else {
		result = returnSensorValue(sensorValues, sensorValueName)
	}
	return result
}

export function checkFomulaValidity(formula: string | undefined): boolean{
	const variablePattern = /[a-zA-Z]+/g
	if (!formula){
		return false
	}
	const variables = formula.match(variablePattern)
	let undefindedValues = ''
	if (variables !== null) {
		for (const variable of variables) {
			if (!(variable in SensorValueTypeNames)){
				undefindedValues += ` ${variable},`
			}
		}
	} else {
		console.debug('No variables found.')
	}
	
	if (undefindedValues.length > 0) {
		const trimmedundefindedValues = undefindedValues.slice(0, undefindedValues.length - 1)
		if (typeof process !== 'undefined' && process !== undefined && process.env.RUNNING_IN_EXTENSION) {
			vscode.window.showErrorMessage(
				`There are no sensor values for the variables:${trimmedundefindedValues}.`)
		}

		return false
	} else {
		return true
	}
}