import { useState } from 'react'

import { FunctionEntry } from '../../../protocols/EditorFileMethodReferenceViewProtocol'

type ReferenceListProps = {
	title: string
	entries: FunctionEntry[]
	keyPrefix: string
	onEntryClick?: (entry: FunctionEntry) => void
}

export function ReferenceList({
	title,
	entries,
	keyPrefix,
	onEntryClick
}: ReferenceListProps) {
	const [isOpen, setIsOpen] = useState(true)

	if (entries.length === 0) {
		return null
	}

	return (
		<>
			<button
				className="reference-first-function__label section reference-first-function__section-toggle"
				onClick={() => setIsOpen((current) => !current)}
				type="button"
			>
				<span
					className={`codicon ${
						isOpen ? 'codicon-chevron-down' : 'codicon-chevron-right'
					} reference-first-function__section-icon`}
				/>
				<span>{title}</span>
			</button>
			{isOpen ? (
				<div className="reference-first-function__table">
					<div className="reference-first-function__row header">
						<div>Identifier</div>
						<div>Cpu(T)</div>
						<div>Cpu(E)</div>
						<div>Ram(E)</div>
					</div>
					{entries.map((entry, idx) => {
						const isClickable =
							onEntryClick !== undefined && entry.isNavigable === true

						return (
								<div
									className="reference-first-function__row"
									key={`${keyPrefix}-${entry.identifier ?? idx}`}
								>
								<div
									className={
										isClickable
											? 'reference-first-function__cell--clickable'
											: ''
									}
									onClick={
										onEntryClick !== undefined
											? () => onEntryClick(entry)
											: undefined
									}
								>
									{entry.name}
								</div>
								<div>{entry.cpuTime ?? ''}</div>
								<div>{entry.cpuEnergy ?? ''}</div>
								<div>{entry.ramEnergy ?? ''}</div>
							</div>
						)
					})}
				</div>
			) : null}
		</>
	)
}
