import {
	ExtendedSensorValueType,
	SensorUnits,
	EnergyConsumptionSensorValueTypes,
	UnitPerSensorValue,
} from '../types/sensorValues'

const DECIMALS_TO_ROUND = 3
const FACTOR_TO_ROUND = Math.pow(10, DECIMALS_TO_ROUND)

export class SensorValueFormatHelper {
	static format(
		value: number,
		sensorValueType: ExtendedSensorValueType
	): {
		value: string,
		unit: SensorUnits
	} {
		const unit = UnitPerSensorValue[sensorValueType]
		let newValue
		const newUnit = unit

		if (value === undefined || value === 0) {
			newValue = '0'
		} else if (EnergyConsumptionSensorValueTypes.includes(sensorValueType)) {
			newValue = (Math.round(value * FACTOR_TO_ROUND) / FACTOR_TO_ROUND).toFixed(DECIMALS_TO_ROUND)
		} else {
			newValue = value.toString()
		}
		return {
			value: newValue,
			unit: newUnit
		}
	}
}