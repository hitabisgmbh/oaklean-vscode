import { SensorValues } from '@oaklean/profiler-core'

export interface Method {
	functionCounter: number;
	sensorValues: SensorValues;
	identifier: string;
	functionName: string;
}
