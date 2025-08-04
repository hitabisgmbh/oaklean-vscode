import { useState, useEffect } from 'react'

import { Dropdown } from '../../../components/select/Dropdown'
import {
	ExtendedSensorValueType,
	SensorValueTypeNames,
	UnitPerSensorValue
} from '../../../../types/sensorValues'

import './styles/option.css'

export type sensorValueTypeOptionProps = {
	sensorValueType: ExtendedSensorValueType
	onChange: (sensorValueType: ExtendedSensorValueType) => void
}

const SENSOR_VALUE_OPTIONS = Object.keys(SensorValueTypeNames).map(
	(sensorValueType) => {
		const unit = UnitPerSensorValue[sensorValueType as ExtendedSensorValueType]
		const name =
			SensorValueTypeNames[sensorValueType as ExtendedSensorValueType]
		return {
			value: sensorValueType,
			label: name + (unit ? ` (${unit})` : '')
		}
	}
)

export function SensorValueTypeOption(props: sensorValueTypeOptionProps) {
	const [sensorValueType, setSensorValueType] =
		useState<ExtendedSensorValueType>(props.sensorValueType)

	useEffect(() => {
		setSensorValueType(props.sensorValueType)
	}, [props.sensorValueType])

	return (
		<div className='option-section'>
			<label>Measurement</label>
			<p>Select the type of measurement this profile is related to.</p>
			<Dropdown
				options={SENSOR_VALUE_OPTIONS}
				value={sensorValueType}
				onChange={(color) => {
					setSensorValueType(color as ExtendedSensorValueType)
					props.onChange(color as ExtendedSensorValueType)
				}}
			/>
		</div>
	)
}
