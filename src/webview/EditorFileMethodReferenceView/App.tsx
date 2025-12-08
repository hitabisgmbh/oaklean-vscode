import { useEffect, useState } from 'react'
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react'

import {
	EditorFileMethodReferenceViewProtocolCommands,
	EditorFileMethodReferenceViewProtocol_ChildToParent,
	EditorFileMethodReferenceViewProtocol_ParentToChild
} from '../../protocols/EditorFileMethodReferenceViewProtocol'
import { FirstFunctionEntry } from '../../protocols/EditorFileMethodReferenceViewProtocol'

import './main.css'

declare const acquireVsCodeApi: any

export const vscode = acquireVsCodeApi()

function postToProvider(message: EditorFileMethodReferenceViewProtocol_ChildToParent) {
	vscode.postMessage(message)
}

export function App() {
	const [fileName, setFileName] = useState('')
	const [firstFunctionName, setFirstFunctionName] = useState('')
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

	return (
		<div className="reference-view">
			<div className="reference-toolbar">
				<span className="reference-toolbar__file-name">{fileName}</span>
				<div className="reference-toolbar__right">
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

					{firstFunctionData.langInternal && firstFunctionData.langInternal.length > 0 ? (
						<>
							<div className="reference-first-function__label section">Lang internal:</div>
							<div className="reference-first-function__table">
								<div className="reference-first-function__row header">
									<div>Identifier</div>
									<div>Cpu(T)</div>
									<div>Cpu(E)</div>
									<div>Ram(E)</div>
								</div>
								{firstFunctionData.langInternal.map((entry, idx) => (
									<div className="reference-first-function__row" key={`lang-${idx}`}>
										<div>{entry.name}</div>
										<div>{entry.cpuTime ?? ''}</div>
										<div>{entry.cpuEnergy ?? ''}</div>
										<div>{entry.ramEnergy ?? ''}</div>
									</div>
								))}
							</div>
						</>
					) : null}

					{firstFunctionData.intern && firstFunctionData.intern.length > 0 ? (
						<>
							<div className="reference-first-function__label section">Intern:</div>
							<div className="reference-first-function__table">
								<div className="reference-first-function__row header">
									<div>Identifier</div>
									<div>Cpu(T)</div>
									<div>Cpu(E)</div>
									<div>Ram(E)</div>
								</div>
								{firstFunctionData.intern.map((entry, idx) => (
									<div className="reference-first-function__row" key={`intern-${idx}`}>
										<div>{entry.name}</div>
										<div>{entry.cpuTime ?? ''}</div>
										<div>{entry.cpuEnergy ?? ''}</div>
										<div>{entry.ramEnergy ?? ''}</div>
									</div>
								))}
							</div>
						</>
					) : null}

					{firstFunctionData.extern && firstFunctionData.extern.length > 0 ? (
						<>
							<div className="reference-first-function__label section">Extern:</div>
							<div className="reference-first-function__table">
								<div className="reference-first-function__row header">
									<div>Identifier</div>
									<div>Cpu(T)</div>
									<div>Cpu(E)</div>
									<div>Ram(E)</div>
								</div>
								{firstFunctionData.extern.map((entry, idx) => (
									<div className="reference-first-function__row" key={`extern-${idx}`}>
										<div>{entry.name}</div>
										<div>{entry.cpuTime ?? ''}</div>
										<div>{entry.cpuEnergy ?? ''}</div>
										<div>{entry.ramEnergy ?? ''}</div>
									</div>
								))}
							</div>
						</>
					) : null}
				</div>
			) : null}
		</div>
	)
}
