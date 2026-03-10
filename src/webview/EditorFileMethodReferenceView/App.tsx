import { useEffect, useState } from 'react'
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react'

import {
	EditorFileMethodReferenceViewProtocolCommands,
	EditorFileMethodReferenceViewProtocol_ChildToParent,
	isEditorFileMethodReferenceViewProtocolParentToChild
} from '../../protocols/EditorFileMethodReferenceViewProtocol'
import { FunctionEntry } from '../../protocols/EditorFileMethodReferenceViewProtocol'
import { OpenSourceLocationProtocolCommands } from '../../protocols/OpenSourceLocationProtocol'
import { CodiconButton } from '../components/buttons/CodiconButton'

import './main.css'

type VSCodeApi = {
	postMessage: (message: unknown) => void
}

declare function acquireVsCodeApi(): VSCodeApi

export const vscode = acquireVsCodeApi()

const SORT_METRICS = {
	cpuTime: 'cpuTime',
	cpuEnergy: 'cpuEnergy',
	ramEnergy: 'ramEnergy'
} as const

type SortMetric = (typeof SORT_METRICS)[keyof typeof SORT_METRICS]

const SORT_DIRECTIONS = {
	desc: 'desc',
	asc: 'asc'
} as const

type SortDirection = (typeof SORT_DIRECTIONS)[keyof typeof SORT_DIRECTIONS]

function postToProvider(
	message: EditorFileMethodReferenceViewProtocol_ChildToParent
) {
	vscode.postMessage(message)
}

export function App() {
	const [fileName, setFileName] = useState('')
	const [firstFunctionName, setFirstFunctionName] = useState('')
	const [isLangInternalOpen, setIsLangInternalOpen] = useState(true)
	const [isInternOpen, setIsInternOpen] = useState(true)
	const [isExternOpen, setIsExternOpen] = useState(true)
	const [isForeignReferencesOpen, setIsForeignReferencesOpen] = useState(true)
	const [sortMetric, setSortMetric] = useState<SortMetric>(SORT_METRICS.cpuTime)
	const [sortDirection, setSortDirection] = useState<SortDirection>(
		SORT_DIRECTIONS.desc
	)
	const [
		showNotPresentInOriginalSourceCode,
		setShowNotPresentInOriginalSourceCode
	] = useState(true)
	const [firstFunctionData, setFirstFunctionData] = useState<{
		main?: FunctionEntry
		langInternal?: FunctionEntry[]
		intern?: FunctionEntry[]
		extern?: FunctionEntry[]
		foreignReferences?: FunctionEntry[]
	}>({})

	// Keep local state in sync with provider messages and request initial payload on mount.
	useEffect(() => {
		function handleMessage(event: MessageEvent<unknown>) {
			const data = event.data
			if (!isEditorFileMethodReferenceViewProtocolParentToChild(data)) {
				return
			}
			if (
				data.command ===
				EditorFileMethodReferenceViewProtocolCommands.updateFileName
			) {
				setFileName(data.fileName ?? '')
			} else if (
				data.command ===
				EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction
			) {
				setFirstFunctionName(data.functionName ?? '')
				// New function context should reopen all sections by default.
				setIsLangInternalOpen(true)
				setIsInternOpen(true)
				setIsExternOpen(true)
				setIsForeignReferencesOpen(true)
				setFirstFunctionData({
					main: data.main,
					langInternal: data.langInternal,
					intern: data.intern,
					extern: data.extern,
					foreignReferences: data.foreignReferences
				})
			}
		}

		window.addEventListener('message', handleMessage)
		// request the current file name on load so the view is in sync immediately
		postToProvider({
			command: EditorFileMethodReferenceViewProtocolCommands.requestFileName
		})
		postToProvider({
			command:
				EditorFileMethodReferenceViewProtocolCommands.requestFirstFunction
		})
		return () => window.removeEventListener('message', handleMessage)
	}, [])

	function openReference(entry: FunctionEntry) {
		// Only navigable rows with complete location data can trigger file navigation.
		if (entry.isNavigable !== true) {
			return
		}
		if (entry.identifier === undefined || entry.relativePath === undefined) {
			return
		}
		postToProvider({
			command: OpenSourceLocationProtocolCommands.openSourceLocation,
			identifier: entry.identifier,
			relativePath: entry.relativePath
		})
	}

	function getClickableCellClass(entry: FunctionEntry) {
		return entry.isNavigable === true
			? 'reference-first-function__cell--clickable'
			: ''
	}

	function sortEntries(entries: FunctionEntry[] | undefined): FunctionEntry[] {
		const valueByMetric: Record<SortMetric, keyof FunctionEntry> = {
			[SORT_METRICS.cpuTime]: SORT_METRICS.cpuTime,
			[SORT_METRICS.cpuEnergy]: SORT_METRICS.cpuEnergy,
			[SORT_METRICS.ramEnergy]: SORT_METRICS.ramEnergy
		}
		const metricKey = valueByMetric[sortMetric]
		const toNumericMetric = (value: unknown): number => {
			// Message payloads can carry numeric fields as strings; normalize before sorting.
			if (typeof value === 'number') {
				return Number.isFinite(value) ? value : 0
			}
			if (typeof value === 'string') {
				const parsedValue = Number(value)
				return Number.isFinite(parsedValue) ? parsedValue : 0
			}
			return 0
		}
		return [...(entries ?? [])].sort((a, b) => {
			const aValue = toNumericMetric(a[metricKey])
			const bValue = toNumericMetric(b[metricKey])
			if (sortDirection === SORT_DIRECTIONS.asc) {
				return aValue - bValue
			}
			return bValue - aValue
		})
	}

	function filterEntries(
		entries: FunctionEntry[] | undefined
	): FunctionEntry[] {
		// Optional filter to hide runtime-only references.
		if (showNotPresentInOriginalSourceCode) {
			return entries ?? []
		}
		return (entries ?? []).filter(
			(entry) => entry.notPresentInOriginalSourceCode !== true
		)
	}

	function prepareEntries(
		entries: FunctionEntry[] | undefined
	): FunctionEntry[] {
		return sortEntries(filterEntries(entries))
	}

	function getSortMetricLabel() {
		if (sortMetric === SORT_METRICS.cpuTime) {
			return 'Cpu(T)'
		}
		if (sortMetric === SORT_METRICS.cpuEnergy) {
			return 'Cpu(E)'
		}
		return 'Ram(E)'
	}

	function cycleSortMetric() {
		if (sortMetric === SORT_METRICS.cpuTime) {
			setSortMetric(SORT_METRICS.cpuEnergy)
			return
		}
		if (sortMetric === SORT_METRICS.cpuEnergy) {
			setSortMetric(SORT_METRICS.ramEnergy)
			return
		}
		setSortMetric(SORT_METRICS.cpuTime)
	}

	function toggleSortDirection() {
		setSortDirection((currentDirection) =>
			currentDirection === SORT_DIRECTIONS.desc
				? SORT_DIRECTIONS.asc
				: SORT_DIRECTIONS.desc
		)
	}

	const langInternalEntries = prepareEntries(firstFunctionData.langInternal)
	const internEntries = prepareEntries(firstFunctionData.intern)
	const externEntries = prepareEntries(firstFunctionData.extern)
	const foreignReferencesEntries = prepareEntries(
		firstFunctionData.foreignReferences
	)
	const hasReferenceData =
		firstFunctionName !== '' ||
		firstFunctionData.main !== undefined ||
		langInternalEntries.length > 0 ||
		internEntries.length > 0 ||
		externEntries.length > 0 ||
		foreignReferencesEntries.length > 0
	const displayedFunctionName =
		firstFunctionName !== ''
			? firstFunctionName
			: (firstFunctionData.main?.name ?? '')

	return (
		<div className="reference-view">
			<div className="reference-toolbar">
				<span className="reference-toolbar__file-name">{fileName}</span>
				<div className="reference-toolbar__right">
					<button
						className="reference-toolbar__sort-label reference-toolbar__sort-button"
						onClick={cycleSortMetric}
						title="Sort entries by Cpu(T), Cpu(E), Ram(E)"
						type="button"
					>
						{getSortMetricLabel()}
					</button>
					<button
						className="reference-toolbar__sort-direction-button"
						onClick={toggleSortDirection}
						title="Toggle sort direction (Desc/Asc)"
						type="button"
					>
						<span
							className={`codicon codicon-arrow-up reference-toolbar__sort-direction-icon ${
								sortDirection === SORT_DIRECTIONS.asc
									? 'reference-toolbar__sort-direction-icon--active'
									: ''
							}`}
						/>
						<span
							className={`codicon codicon-arrow-down reference-toolbar__sort-direction-icon ${
								sortDirection === SORT_DIRECTIONS.desc
									? 'reference-toolbar__sort-direction-icon--active'
									: ''
							}`}
						/>
					</button>
					<CodiconButton
						codiconName={
							showNotPresentInOriginalSourceCode
								? 'codicon-eye'
								: 'codicon-eye-closed'
						}
						onClick={() => {
							setShowNotPresentInOriginalSourceCode((previous) => !previous)
						}}
						title="Show/Hide entries that are not present in original source code"
					/>
					<VSCodeButton
						appearance="secondary"
						onClick={() => {
							postToProvider({
								command:
									EditorFileMethodReferenceViewProtocolCommands.closeActiveFile
							})
						}}
					>
						Close
					</VSCodeButton>
				</div>
			</div>
			{hasReferenceData ? (
				<div className="reference-first-function">
					<div className="reference-first-function__label">
						Current function
					</div>
					<div className="reference-first-function__name">
						{displayedFunctionName !== '' ? `${displayedFunctionName}()` : ''}
					</div>

					{langInternalEntries.length > 0 ? (
						<>
							<button
								className="reference-first-function__label section reference-first-function__section-toggle"
								onClick={() => setIsLangInternalOpen((current) => !current)}
								type="button"
							>
								<span
									className={`codicon ${
										isLangInternalOpen
											? 'codicon-chevron-down'
											: 'codicon-chevron-right'
									} reference-first-function__section-icon`}
								/>
								<span>Lang internal:</span>
							</button>
							{isLangInternalOpen ? (
								<div className="reference-first-function__table">
									<div className="reference-first-function__row header">
										<div>Identifier</div>
										<div>Cpu(T)</div>
										<div>Cpu(E)</div>
										<div>Ram(E)</div>
									</div>
									{langInternalEntries.map((entry, idx) => (
										<div
											className="reference-first-function__row"
											key={`lang-${idx}`}
										>
											<div>{entry.name}</div>
											<div>{entry.cpuTime ?? ''}</div>
											<div>{entry.cpuEnergy ?? ''}</div>
											<div>{entry.ramEnergy ?? ''}</div>
										</div>
									))}
								</div>
							) : null}
						</>
					) : null}

					{internEntries.length > 0 ? (
						<>
							<button
								className="reference-first-function__label section reference-first-function__section-toggle"
								onClick={() => setIsInternOpen((current) => !current)}
								type="button"
							>
								<span
									className={`codicon ${
										isInternOpen
											? 'codicon-chevron-down'
											: 'codicon-chevron-right'
									} reference-first-function__section-icon`}
								/>
								<span>Intern:</span>
							</button>
							{isInternOpen ? (
								<div className="reference-first-function__table">
									<div className="reference-first-function__row header">
										<div>Identifier</div>
										<div>Cpu(T)</div>
										<div>Cpu(E)</div>
										<div>Ram(E)</div>
									</div>
									{internEntries.map((entry, idx) => (
										<div
											className="reference-first-function__row"
											key={`intern-${idx}`}
										>
											<div
												className={getClickableCellClass(entry)}
												onClick={() => openReference(entry)}
											>
												{entry.name}
											</div>
											<div>{entry.cpuTime ?? ''}</div>
											<div>{entry.cpuEnergy ?? ''}</div>
											<div>{entry.ramEnergy ?? ''}</div>
										</div>
									))}
								</div>
							) : null}
						</>
					) : null}

					{externEntries.length > 0 ? (
						<>
							<button
								className="reference-first-function__label section reference-first-function__section-toggle"
								onClick={() => setIsExternOpen((current) => !current)}
								type="button"
							>
								<span
									className={`codicon ${
										isExternOpen
											? 'codicon-chevron-down'
											: 'codicon-chevron-right'
									} reference-first-function__section-icon`}
								/>
								<span>Extern:</span>
							</button>
							{isExternOpen ? (
								<div className="reference-first-function__table">
									<div className="reference-first-function__row header">
										<div>Identifier</div>
										<div>Cpu(T)</div>
										<div>Cpu(E)</div>
										<div>Ram(E)</div>
									</div>
									{externEntries.map((entry, idx) => (
										<div
											className="reference-first-function__row"
											key={`extern-${idx}`}
										>
											<div
												className={getClickableCellClass(entry)}
												onClick={() => openReference(entry)}
											>
												{entry.name}
											</div>
											<div>{entry.cpuTime ?? ''}</div>
											<div>{entry.cpuEnergy ?? ''}</div>
											<div>{entry.ramEnergy ?? ''}</div>
										</div>
									))}
								</div>
							) : null}
						</>
					) : null}

					{foreignReferencesEntries.length > 0 ? (
						<>
							<button
								className="reference-first-function__label section reference-first-function__section-toggle"
								onClick={() =>
									setIsForeignReferencesOpen((current) => !current)
								}
								type="button"
							>
								<span
									className={`codicon ${
										isForeignReferencesOpen
											? 'codicon-chevron-down'
											: 'codicon-chevron-right'
									} reference-first-function__section-icon`}
								/>
								<span>Foreign References:</span>
							</button>
							{isForeignReferencesOpen ? (
								<div className="reference-first-function__table">
									<div className="reference-first-function__row header">
										<div>Identifier</div>
										<div>Cpu(T)</div>
										<div>Cpu(E)</div>
										<div>Ram(E)</div>
									</div>
									{foreignReferencesEntries.map((entry, idx) => (
										<div
											className="reference-first-function__row"
											key={`foreign-${idx}`}
										>
											<div
												className={getClickableCellClass(entry)}
												onClick={() => openReference(entry)}
											>
												{entry.name}
											</div>
											<div>{entry.cpuTime ?? ''}</div>
											<div>{entry.cpuEnergy ?? ''}</div>
											<div>{entry.ramEnergy ?? ''}</div>
										</div>
									))}
								</div>
							) : null}
						</>
					) : null}
				</div>
			) : null}
		</div>
	)
}
