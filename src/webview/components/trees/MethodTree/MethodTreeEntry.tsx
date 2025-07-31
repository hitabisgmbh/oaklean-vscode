import './MethodTreeEntry.css'

type MethodTreeEntryProps = {
	onClick?: () => void
	labelCodicon: string
	labelText: string
	showNPIOSCMarker?: boolean
	sensorValue?: string
	sensorValueUnit?: string
}

export function MethodTreeEntry({
	onClick,
	labelCodicon,
	labelText,
	showNPIOSCMarker,
	sensorValue,
	sensorValueUnit
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
			<>
				<span className="sensorValue">
					<span className="self" title='value of this node'>{sensorValue}</span>
					<span className="unit"> {sensorValueUnit}</span>
				</span>
			</>
		</div>
	)
}
