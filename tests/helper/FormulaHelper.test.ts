import { calcOrReturnSensorValue, checkFormulaValidity } from '../../src/helper/FormulaHelper'

describe('FormulaHelper', () => {
	let sensorValues: Record<string, any>

	beforeEach(() => {
		sensorValues = {
			profilerHits: 4,
			selfCPUTime: 300,
			customFormula: 'profilerHits * selfCPUTime'
		}
	})

	describe('calcOrReturnSensorValue', () => {
		it('should return the sensor value if sensorValueName is not "customFormula"', () => {
			const result = calcOrReturnSensorValue(sensorValues, 'profilerHits', undefined)
			expect(result).toBe(4)
		})

		it('should calculate the formula if sensorValueName is "customFormula"', () => {
			const result = calcOrReturnSensorValue(sensorValues, 'customFormula', sensorValues.customFormula)
			expect(result).toBe(1200)
		})

		it('should throw an error if assembledFormula is wrong', () => {
			expect(() => calcOrReturnSensorValue(sensorValues, 'customFormula', 'wrongFormula')).toThrow('assembledFormula is wrong')
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