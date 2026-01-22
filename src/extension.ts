import vscode, { ExtensionContext } from 'vscode'

import { Container } from './container'
import { Storage } from './storage'
import { DocumentationViewPanel } from './panels/DocumentationViewPanel'
import { SettingsViewPanel } from './panels/SettingsViewPanel'
import { ThemeColorViewerPanel } from './panels/ThemeColorViewerPanel'


process.env.RUNNING_IN_EXTENSION = 'true'


export function activate(context: ExtensionContext) {
	const storage = new Storage(context)

	const container = Container.create(context, storage)

	context.subscriptions.push(
		vscode.window.registerWebviewPanelSerializer(SettingsViewPanel.viewType, {
			async deserializeWebviewPanel(panel) {
				SettingsViewPanel.revive(panel, container)
			}
		}),
		vscode.window.registerWebviewPanelSerializer(ThemeColorViewerPanel.viewType, {
			async deserializeWebviewPanel(panel) {
				await ThemeColorViewerPanel.revive(panel, container)
			}
		}),
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
