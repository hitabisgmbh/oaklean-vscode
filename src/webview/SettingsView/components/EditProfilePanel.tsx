import React, { useEffect, useState } from 'react'
import {
	VSCodePanelTab,
	VSCodePanelView,
	VSCodeDropdown,
	VSCodeButton,
	VSCodeDivider,
	VSCodeOption
} from '@vscode/webview-ui-toolkit/react'

import './styles/panel.css'

import { ColorOption } from './options/ColorOption'
import { SensorValueTypeOption } from './options/SensorValueTypeOption'
import { ProfileNameOption } from './options/ProfileNameOption'
import { CustomFormulaOption } from './options/CustomFormulaOption'

import { Profile } from '../../../types/profile'
import { Color } from '../../../types/color'
import { ExtendedSensorValueType } from '../../../types/sensorValues'

export type EditProfilePanelProps = {
	profile: Profile
	profiles: Profile[]
	onProfileChange: (profileName: string) => void
	onProfileDelete: (profileName: string) => void
	onSave: (profile: Profile) => void
}

export function EditProfilePanel(props: EditProfilePanelProps) {
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
			<VSCodePanelTab>Profiles</VSCodePanelTab>
			<VSCodePanelView>
				<section className="options">
					<div className="inline">
						<VSCodeDropdown
							value={name}
							onChange={(e) => {
								if (e.target) {
									const profileName = (e.target as any).value as string
									props.onProfileChange(profileName)
								}
							}}
						>
							{props.profiles.map((profile) => {
								return (
									<VSCodeOption key={profile.name} value={profile.name}>
										{profile.name}
									</VSCodeOption>
								)
							})}
						</VSCodeDropdown>
						<VSCodeButton
							className="deleteButton"
							appearance="primary"
							onClick={() => props.onProfileDelete(name)}
						>
							<div className="codicon codicon-trashcan icon"></div>
						</VSCodeButton>
					</div>
					<VSCodeDivider role="separator"></VSCodeDivider>
					<h2>Edit Profile</h2>
					<ProfileNameOption
						name={name}
						readOnly={true}
						onChange={(name) => setName(name)}
					/>
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
						formula={formula}
						className={measurement === 'customFormula' ? '' : 'hidden'}
						onChange={(formula) => setFormula(formula)}
					/>
					<VSCodeButton
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
						Save Changes
					</VSCodeButton>
				</section>
			</VSCodePanelView>
		</>
	)
}
