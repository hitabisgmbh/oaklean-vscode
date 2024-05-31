import { ExtendedSensorValueType } from '../types/sensorValues'
import { Color } from '../types/color'

export type Profile = {
	//id: number;
	name: string
	color: Color
	measurement: ExtendedSensorValueType
	formula?: string
}