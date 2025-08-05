import { useState, useEffect } from 'react'
import { VSCodeTextField } from '@vscode/webview-ui-toolkit/react'

import './styles/option.css'

export type CustomFormulaOptionProps = {
	formula: string | undefined
	className?: string
	onChange: (formula: string) => void
}

export function CustomFormulaOption(props: CustomFormulaOptionProps) {
	const [formula, setFormula] = useState(props.formula)

	useEffect(() => {
		setFormula(props.formula)
	}, [props.formula])

	return (
		<div className={'option-section' + props.className ? ` ${props.className}` : ''}>
			<label>Enter a formula</label>
			<p>A custom formula to relate different types of measurement data to each other as desired.</p>
			<VSCodeTextField
				value={formula || ''}
				placeholder="e.g., aggregatedCPUTime/profilerHits"
				onInput={(e) => {
					const value = (e.target as HTMLInputElement).value
					setFormula(value)
					props.onChange(value)
				}}
			></VSCodeTextField>
		</div>
	)
}
