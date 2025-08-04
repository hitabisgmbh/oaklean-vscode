import { useState, useEffect } from 'react'
import { VSCodeTextField } from '@vscode/webview-ui-toolkit/react'

import './styles/option.css'

export type ProfileNameOptionProps = {
	readOnly?: boolean
	name: string
	onChange: (name: string) => void
}

export function ProfileNameOption(props: ProfileNameOptionProps) {
	const [name, setName] = useState(props.name)

	useEffect(() => {
		setName(props.name)
	}, [props.name])

	return (
		<div className='option-section'>
			<label>Name</label>
			<p>Name of the profile</p>
			<VSCodeTextField
				readOnly={props.readOnly}
				value={name}
				onInput={(e) => {
					const value = (e.target as HTMLInputElement).value
					setName(value)
					props.onChange(value)
				}}
			></VSCodeTextField>
		</div>
	)
}
