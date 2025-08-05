import { ExtendedSensorValueType } from '../types/sensorValues'
import { Color } from '../types/color'

export type Profile = {
	//id: number;
	name: string
	color: Color
	measurement: ExtendedSensorValueType
	formula?: string
}

export const DEFAULT_PROFILE: Profile = {
	name: 'Default',
	color: Color.Red,
	measurement: 'profilerHits'
}
