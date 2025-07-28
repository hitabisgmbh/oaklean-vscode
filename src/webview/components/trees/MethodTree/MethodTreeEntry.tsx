import './MethodTreeEntry.css'

type MethodTreeEntryProps = {
	onClick?: () => void
	labelCodicon: string
	labelText: string
	showNPIOSCMarker?: boolean
	sensorValueString?: string
}

export function MethodTreeEntry({
	onClick,
	labelCodicon,
	labelText,
	showNPIOSCMarker,
	sensorValueString
}: MethodTreeEntryProps) {
	return (
		<div className="method-tree-entry" onClick={onClick}>
			<span className={`icon codicon ${labelCodicon}`}></span>
			<span className="text">{labelText}</span>
			{showNPIOSCMarker ? (
				<span
					className={'npiosc-marker icon codicon codicon-eye-closed'}
					title="This source location was only available during runtime"
				></span>
			) : undefined}
			{sensorValueString ? (
				<>
					<span className="sensorValue">{sensorValueString}</span>
				</>
			) : (
				''
			)}
		</div>
	)
}
