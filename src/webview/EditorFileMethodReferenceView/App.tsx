import { useEffect, useState } from 'react'
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react'

import {
	EditorFileMethodReferenceViewProtocolCommands,
	EditorFileMethodReferenceViewProtocol_ChildToParent,
	EditorFileMethodReferenceViewProtocol_ParentToChild
} from '../../protocols/EditorFileMethodReferenceViewProtocol'
import { FirstFunctionEntry } from '../../protocols/EditorFileMethodReferenceViewProtocol'
import { OpenSourceLocationProtocolCommands } from '../../protocols/OpenSourceLocationProtocol'
import { CodiconButton } from '../components/buttons/CodiconButton'

import './main.css'

declare const acquireVsCodeApi: any

export const vscode = acquireVsCodeApi()

type SortMetric = 'cpuTime' | 'cpuEnergy' | 'ramEnergy'

function postToProvider(message: EditorFileMethodReferenceViewProtocol_ChildToParent) {
	vscode.postMessage(message)
}

export function App() {
	const [fileName, setFileName] = useState('')
	const [firstFunctionName, setFirstFunctionName] = useState('')
	const [isLangInternalOpen, setIsLangInternalOpen] = useState(true)
	const [isInternOpen, setIsInternOpen] = useState(true)
	const [isExternOpen, setIsExternOpen] = useState(true)
	const [sortMetric, setSortMetric] = useState<SortMetric>('cpuTime')
	const [showNotPresentInOriginalSourceCode, setShowNotPresentInOriginalSourceCode] = useState(true)
	const [firstFunctionData, setFirstFunctionData] = useState<{
		main?: FirstFunctionEntry
		langInternal?: FirstFunctionEntry[]
		intern?: FirstFunctionEntry[]
		extern?: FirstFunctionEntry[]
	}>({})

	useEffect(() => {
		function handleMessage(event: { data: EditorFileMethodReferenceViewProtocol_ParentToChild }) {
			if (event.data?.command === EditorFileMethodReferenceViewProtocolCommands.updateFileName) {
				setFileName(event.data.fileName || '')
			} else if (event.data?.command === EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction) {
				setFirstFunctionName(event.data.functionName || '')
				setIsLangInternalOpen(true)
				setIsInternOpen(true)
				setIsExternOpen(true)
				setFirstFunctionData({
					main: event.data.main,
					langInternal: event.data.langInternal,
					intern: event.data.intern,
					extern: event.data.extern
				})
			}
		}

		window.addEventListener('message', handleMessage)
		// request the current file name on load so the view is in sync immediately
		postToProvider({
			command: EditorFileMethodReferenceViewProtocolCommands.requestFileName
		})
		postToProvider({
			command: EditorFileMethodReferenceViewProtocolCommands.requestFirstFunction
		})
		return () => window.removeEventListener('message', handleMessage)
	}, [])

	function openReference(entry: FirstFunctionEntry) {
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

	function getClickableCellClass(entry: FirstFunctionEntry) {
		return entry.isNavigable === true ? 'reference-first-function__cell--clickable' : ''
	}

	function sortEntries(entries: FirstFunctionEntry[] | undefined): FirstFunctionEntry[] {
		const valueByMetric: Record<SortMetric, keyof FirstFunctionEntry> = {
			cpuTime: 'cpuTime',
			cpuEnergy: 'cpuEnergy',
			ramEnergy: 'ramEnergy'
		}
		const metricKey = valueByMetric[sortMetric]
		return [...(entries || [])].sort((a, b) => {
			const aValue = (a[metricKey] as number | undefined) ?? 0
			const bValue = (b[metricKey] as number | undefined) ?? 0
			return bValue - aValue
		})
	}

	function filterEntries(entries: FirstFunctionEntry[] | undefined): FirstFunctionEntry[] {
		if (showNotPresentInOriginalSourceCode) {
			return entries || []
		}
		return (entries || []).filter((entry) => entry.notPresentInOriginalSourceCode !== true)
	}

	function prepareEntries(entries: FirstFunctionEntry[] | undefined): FirstFunctionEntry[] {
		return sortEntries(filterEntries(entries))
	}

	function getSortMetricLabel() {
		if (sortMetric === 'cpuTime') {
			return 'Cpu(T)'
		}
		if (sortMetric === 'cpuEnergy') {
			return 'Cpu(E)'
		}
		return 'Ram(E)'
	}

	function cycleSortMetric() {
		if (sortMetric === 'cpuTime') {
			setSortMetric('cpuEnergy')
			return
		}
		if (sortMetric === 'cpuEnergy') {
			setSortMetric('ramEnergy')
			return
		}
		setSortMetric('cpuTime')
	}

	const langInternalEntries = prepareEntries(firstFunctionData.langInternal)
	const internEntries = prepareEntries(firstFunctionData.intern)
	const externEntries = prepareEntries(firstFunctionData.extern)

	return (
		<div className="reference-view">
			<div className="reference-toolbar">
				<span className="reference-toolbar__file-name">{fileName}</span>
				<div className="reference-toolbar__right">
					<div className="reference-toolbar__sort-label">
						{getSortMetricLabel()}
					</div>
					<CodiconButton
						codiconName="codicon-arrow-swap"
						onClick={cycleSortMetric}
						title="Sort entries by Cpu(T), Cpu(E), Ram(E)"
					/>
					<CodiconButton
						codiconName={
							showNotPresentInOriginalSourceCode ? 'codicon-eye' : 'codicon-eye-closed'
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
			{firstFunctionName ? (
				<div className="reference-first-function">
					<div className="reference-first-function__label">First function</div>
					<div className="reference-first-function__name">{firstFunctionName}()</div>

					{langInternalEntries.length > 0 ? (
						<>
							<button
								className="reference-first-function__label section reference-first-function__section-toggle"
								onClick={() => setIsLangInternalOpen((current) => !current)}
								type="button"
							>
								<span
									className={`codicon ${
										isLangInternalOpen ? 'codicon-chevron-down' : 'codicon-chevron-right'
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
										<div className="reference-first-function__row" key={`lang-${idx}`}>
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
										isInternOpen ? 'codicon-chevron-down' : 'codicon-chevron-right'
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
										<div className="reference-first-function__row" key={`intern-${idx}`}>
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
										isExternOpen ? 'codicon-chevron-down' : 'codicon-chevron-right'
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
										<div className="reference-first-function__row" key={`extern-${idx}`}>
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
