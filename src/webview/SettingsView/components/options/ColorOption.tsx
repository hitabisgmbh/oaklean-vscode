import { useState, useEffect } from 'react'

import './styles/option.css'

import { Dropdown } from '../../../components/select/Dropdown'
import { Color } from '../../../../types/color'

export type ColorOptionProps = {
	color: Color
	onChange: (color: Color) => void
}

export function ColorOption(props: ColorOptionProps) {
	const [color, setColor] = useState<Color>(props.color)

	useEffect(() => {
		setColor(props.color)
	}, [props.color])

	return (
		<div className='option-section'>
			<label>Color</label>
			<p>
				Select a color to associate with this profile. This color will help you
				visually distinguish this profile from others.
			</p>
			<Dropdown
				options={Object.values(Color).map((colorName) => {
					return { value: colorName, label: colorName }
				})}
				value={color}
				onChange={(color) => {
					setColor(color as Color)
					props.onChange(color as Color)
				}}
			/>
		</div>
	)
}
