import { ISensorValues, MicroSeconds_number } from '@oaklean/profiler-core'

import { calcOrReturnSensorValue, checkFormulaValidity } from '../../src/helper/FormulaHelper'
import { ValueRepresentationType } from '../../src/types/valueRepresentationTypes'

describe('FormulaHelper', () => {
	let sensorValues: ISensorValues
	let customFormula: string

	beforeEach(() => {
		customFormula = 'profilerHits * selfCPUTime'
		sensorValues = {
			profilerHits: 4,
			selfCPUTime: 300 as MicroSeconds_number,
		}
	})

	describe('calcOrReturnSensorValue', () => {
		it('should return the sensor value if sensorValueName is not "customFormula"', () => {
			for (const selectedValueRepresentation of Object.values(ValueRepresentationType)) {
				const result = calcOrReturnSensorValue(sensorValues, {
					selectedSensorValueType: 'profilerHits',
					selectedValueRepresentation,
					formula: undefined
				})
				expect(result).toBe(4)
			}
		})

		it('should calculate the formula if sensorValueName is "customFormula"', () => {
			for (const selectedValueRepresentation of Object.values(ValueRepresentationType)) {
				const result = calcOrReturnSensorValue(
					sensorValues,
					{
						selectedSensorValueType: 'customFormula',
						selectedValueRepresentation,
						formula: customFormula
					}
				)
				expect(result).toBe(1200)
			}
		})

		it('should throw an error if assembledFormula is wrong', () => {
			for (const selectedValueRepresentation of Object.values(ValueRepresentationType)) {
				expect(() => {
					calcOrReturnSensorValue(
						sensorValues,
						{
							selectedSensorValueType: 'customFormula',
							selectedValueRepresentation,
							formula: 'wrongFormula'
						}
					)
				}).toThrow('assembledFormula is wrong')
			}
		})
	})

	describe('checkFormulaValidity', () => {
		it('should return false if formula is undefined', () => {
			const result = checkFormulaValidity(undefined)
			expect(result).toBe(false)
		})

		it('should return false if formula contains undefined variables', () => {
			const result = checkFormulaValidity('undefinedVariable + 1')
			expect(result).toBe(false)
		})

		it('should return true if formula is valid', () => {
			const result = checkFormulaValidity('profilerHits + 1')
			expect(result).toBe(true)
		})
	})
})