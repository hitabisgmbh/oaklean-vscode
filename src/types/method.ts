import {
	SensorValues,
	SourceNodeIdentifierPart_string
} from '@oaklean/profiler-core'

export interface Method {
	functionCounter: number
	sensorValues: SensorValues
	identifier: string
	sourceNodeIdentifierPart: SourceNodeIdentifierPart_string
}
