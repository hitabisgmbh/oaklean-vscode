import { provideVSCodeDesignSystem, allComponents, Button } from '@vscode/webview-ui-toolkit'

import { ReportWebViewProtocol_ChildToParent, ReportWebviewProtocol_ParentToChild } from '../protocols/reportWebviewProtocol'

declare const acquireVsCodeApi: any

provideVSCodeDesignSystem().register(allComponents)

export const vscode = acquireVsCodeApi()

function postToWebViewPanel(command: ReportWebViewProtocol_ChildToParent) {
	vscode.postMessage(command)
}

window.addEventListener('DOMContentLoaded', () => {
	main()
})


export function main() {
	const jsonButton = document.getElementById('jsonButton') as Button
	if (jsonButton !== null && jsonButton !== undefined) {
		jsonButton.addEventListener('click', () => {
			handleJsonButton()
		})
	}
	window.addEventListener('message', (event) => {
		const message = event.data as ReportWebviewProtocol_ParentToChild
		switch (message.command) {
			case 'json':
				handleJsonButton()
				break
		}
	})
}

function handleJsonButton() {
	const filePath = (document.getElementById('filePath') as HTMLInputElement)?.value
	postToWebViewPanel({
		command: 'openFile',
		filePath: filePath
	})
}