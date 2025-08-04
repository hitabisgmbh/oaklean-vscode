import {
	provideVSCodeDesignSystem,
	allComponents,
	Button
} from '@vscode/webview-ui-toolkit'

import {
	ReportViewProtocolCommands,
	ReportViewProtocol_ChildToParent
} from '../protocols/ReportViewProtocol'

declare const acquireVsCodeApi: any

provideVSCodeDesignSystem().register(allComponents)

export const vscode = acquireVsCodeApi()

function postToWebViewPanel(command: ReportViewProtocol_ChildToParent) {
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
}

function handleJsonButton() {
	const filePath = (document.getElementById('filePath') as HTMLInputElement)
		?.value
	postToWebViewPanel({
		command:	ReportViewProtocolCommands.openAsJson
	})
}
