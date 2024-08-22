import { ExtendedSensorValueType } from './sensorValues'
import { ValueRepresentationType } from './valueRepresentationTypes'

export type SensorValueRepresentation = {
	selectedSensorValueType: ExtendedSensorValueType,
	selectedValueRepresentation: ValueRepresentationType,
	formula: string | undefined,
}

export function defaultSensorValueRepresentation(): SensorValueRepresentation {
	return {
		selectedSensorValueType: 'aggregatedCPUTime',
		selectedValueRepresentation: ValueRepresentationType.absolute,
		formula: ''
	}
}