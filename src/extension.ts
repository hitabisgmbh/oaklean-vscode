import vscode, { ExtensionContext } from 'vscode'

import { Container } from './container'
import { Storage } from './storage'
import { DocumentationViewPanel } from './panels/DocumentationViewPanel'



process.env.RUNNING_IN_EXTENSION = 'true'



export function activate(context: ExtensionContext) {

	const storage = new Storage(context)
	const container = Container.create(context, storage)

	context.subscriptions.push(
		vscode.window.registerWebviewPanelSerializer(DocumentationViewPanel.viewType, {
			async deserializeWebviewPanel(panel) {
				DocumentationViewPanel.revive(panel, container)
			}
		})
	)
}

export function deactivate() {
	return undefined
}
