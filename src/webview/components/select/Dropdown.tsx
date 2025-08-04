import { useEffect, useState } from 'react'
import {
	VSCodeDropdown,
	VSCodeOption
} from '@vscode/webview-ui-toolkit/react'

import './Dropdown.css'
import { Color } from '../../../types/color'

export type DropdownProps = {
	value: string
	options: {
		value: string,
		label: string
	}[]
	onChange: (value: string) => void
}

export function Dropdown<T>(props: DropdownProps) {
	const [value, setValue] = useState(props.value)

	useEffect(() => {
		setValue(props.value)
	}, [props.value])

	return (
		<VSCodeDropdown className='dropdown' value={value} onChange={
			(e) => {
				if (e.target) {
					const value = (e.target as HTMLSelectElement).value as Color
					setValue(value)
					props.onChange(value)
				}
			}
		}>
			{props.options.map(({ value, label }) => (
				<VSCodeOption key={value} value={value}>{label}</VSCodeOption>
			))}
		</VSCodeDropdown>
	)
}
