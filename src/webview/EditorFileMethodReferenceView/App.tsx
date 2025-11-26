import { useEffect, useState } from 'react'
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react'

import {
	EditorFileMethodReferenceViewProtocolCommands,
	EditorFileMethodReferenceViewProtocol_ChildToParent,
	EditorFileMethodReferenceViewProtocol_ParentToChild
} from '../../protocols/EditorFileMethodReferenceViewProtocol'

import './main.css'

declare const acquireVsCodeApi: any

export const vscode = acquireVsCodeApi()

function postToProvider(message: EditorFileMethodReferenceViewProtocol_ChildToParent) {
	vscode.postMessage(message)
}

export function App() {
	const [fileName, setFileName] = useState('')

	useEffect(() => {
		function handleMessage(event: { data: EditorFileMethodReferenceViewProtocol_ParentToChild }) {
			if (event.data?.command === EditorFileMethodReferenceViewProtocolCommands.updateFileName) {
				setFileName(event.data.fileName || '')
			}
		}

		window.addEventListener('message', handleMessage)
		// request the current file name on load so the view is in sync immediately
		postToProvider({
			command: EditorFileMethodReferenceViewProtocolCommands.requestFileName
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
		</div>
	)
}
