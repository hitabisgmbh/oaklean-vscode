import { useEffect, useState } from 'react'
import {
	VSCodePanelTab,
	VSCodePanelView,
	VSCodeButton
} from '@vscode/webview-ui-toolkit/react'

import './styles/panel.css'

import { ProfileNameOption } from './options/ProfileNameOption'
import { ColorOption } from './options/ColorOption'
import { SensorValueTypeOption } from './options/SensorValueTypeOption'
import { CustomFormulaOption } from './options/CustomFormulaOption'

import { Profile } from '../../../types/profile'
import { Color } from '../../../types/color'
import { ExtendedSensorValueType } from '../../../types/sensorValues'

export type NewProfilePanelProps = {
	profile: Profile
	onSave: (profile: Profile) => void
}

export function NewProfilePanel(props: NewProfilePanelProps) {
	const [name, setName] = useState(props.profile.name)
	const [color, setColor] = useState<Color>(props.profile.color)
	const [measurement, setMeasurement] = useState(props.profile.measurement)
	const [formula, setFormula] = useState<string | undefined>(
		props.profile.formula
	)

	useEffect(() => {
		setName(props.profile.name)
		setColor(props.profile.color)
		setMeasurement(props.profile.measurement)
		setFormula(props.profile.formula)
	}, [props])

	return (
		<>
			<VSCodePanelTab>New Profile</VSCodePanelTab>
			<VSCodePanelView>
				<section className="options">
					<h2>Add Profile</h2>
					<ProfileNameOption name={name} onChange={(name) => setName(name)} />
					<ColorOption
						color={color}
						onChange={(color) => setColor(color as Color)}
					></ColorOption>
					<SensorValueTypeOption
						sensorValueType={measurement as ExtendedSensorValueType}
						onChange={(measurement) =>
							setMeasurement(measurement as ExtendedSensorValueType)
						}
					/>
					<CustomFormulaOption
						formula={formula || ''}
						className={measurement === 'customFormula' ? '' : 'hidden'}
						onChange={(formula) => setFormula(formula)}
					/>
					<VSCodeButton
						id="saveNewProfileButton"
						appearance="primary"
						onClick={() => {
							props.onSave({
								name,
								color,
								measurement: measurement,
								formula: formula
							})
						}}
					>
						Save
					</VSCodeButton>
				</section>
			</VSCodePanelView>
		</>
	)
}
