import { useEffect, useState, ChangeEvent } from 'react'
import { VSCodeTextField } from '@vscode/webview-ui-toolkit/react'
import './main.css'

import {
	FilterViewCommands,
	FilterViewProtocol_ChildToParent,
	FilterViewProtocol_ParentToChild
} from '../../protocols/filterViewProtocol'

declare const acquireVsCodeApi: any

export const vscode = acquireVsCodeApi()

function postToProvider(message: FilterViewProtocol_ChildToParent) {
	vscode.postMessage(message)
}

export function App() {
	// Local state to manage the text inputs
	const [includedFilterPath, setIncludedFilterPath] = useState('')
	const [excludedFilterPath, setExcludedFilterPath] = useState('')

	function handleExtensionMessages(message: {
		data: FilterViewProtocol_ParentToChild
	}) {
		switch (message.data.command) {
			case FilterViewCommands.renderFilterView:
				setIncludedFilterPath(message.data.filePaths.includedFilterPath || '')
				setExcludedFilterPath(message.data.filePaths.excludedFilterPath || '')
				break
		}
	}

	useEffect(() => {
		window.addEventListener('message', handleExtensionMessages)
		postToProvider({ command: FilterViewCommands.viewLoaded })

		return () => {
			window.removeEventListener('message', handleExtensionMessages)
		}
	}, [])

	function onFilterPathInput(
		type: 'included' | 'excluded'
	) {
		return function (e: any) {
			if (e.target) {
				const newVal = (e.target as HTMLInputElement).value
				const filePaths = {
					includedFilterPath,
					excludedFilterPath
				}
				if (type === 'included') {
					filePaths.includedFilterPath = newVal
					setIncludedFilterPath(newVal)
				}
				if (type === 'excluded') {
					filePaths.excludedFilterPath = newVal
					setExcludedFilterPath(newVal)
				}

				postToProvider({
					command: FilterViewCommands.filterPathsEdited,
					filePaths: filePaths
				})
				console.log({
					command: FilterViewCommands.filterPathsEdited,
					filePaths: filePaths
				})
			}
		}
	}

	return (
		<>
			<VSCodeTextField
				className="include-exclude-field"
				placeholder="e.g. *.ts, src/**/include"
				value={includedFilterPath}
				onInput={onFilterPathInput('included')}
			>
				Included files path
			</VSCodeTextField>
			<VSCodeTextField
				className="include-exclude-field"
				placeholder="e.g. *.ts, src/**/exclude"
				value={excludedFilterPath}
				onInput={onFilterPathInput('excluded')}
			>
				Excluded files path
			</VSCodeTextField>
		</>
	)
}
