import vscode from 'vscode'

import { Container } from '../container'
import {
	DOCUMENTATION_VIEW_PANEL_TYPE,
	DOCUMENTATION_VIEW_TITLE
} from '../constants/documentationView'
import { DocumentationViewProvider } from '../WebViewProviders/DocumentationViewProvider'
import { DocumentationViewCommands } from '../protocols/DocumentationViewProtocol'

export class DocumentationViewPanel {
	public static readonly viewType = DOCUMENTATION_VIEW_PANEL_TYPE
	public static currentPanel: DocumentationViewPanel | undefined
	private readonly _panel: vscode.WebviewPanel
	private subscriptions: vscode.Disposable[] = []
	private webViewProvider: DocumentationViewProvider

	private constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _container: Container,
		panel?: vscode.WebviewPanel
	) {
		this._panel =
			panel ??
			vscode.window.createWebviewPanel(
				DocumentationViewPanel.viewType,
				DOCUMENTATION_VIEW_TITLE,
				vscode.ViewColumn.Beside,
				{
					enableScripts: true,
					retainContextWhenHidden: true
				}
			)

		this.subscriptions.push(
			(this.webViewProvider = new DocumentationViewProvider(
				this._extensionUri,
				this._container
			))
		)
		this.webViewProvider.resolveWebviewForPanel(this._panel.webview)

		this.subscriptions.push(
			this._panel,
			this._panel.onDidDispose(() => this.dispose())
		)

		this._panel.onDidChangeViewState(() => {
			this._panel.webview.postMessage({
				type: DocumentationViewCommands.requestDocs
			})
		})
	}

	public static render(container: Container): DocumentationViewPanel {
		if (DocumentationViewPanel.currentPanel !== undefined) {
			DocumentationViewPanel.currentPanel._panel.reveal()
		} else {
			DocumentationViewPanel.currentPanel = new DocumentationViewPanel(
				container.context.extensionUri,
				container
			)
		}
		return DocumentationViewPanel.currentPanel
	}

	public static revive(
		panel: vscode.WebviewPanel,
		container: Container
	): DocumentationViewPanel {
		DocumentationViewPanel.currentPanel = new DocumentationViewPanel(
			container.context.extensionUri,
			container,
			panel
		)
		return DocumentationViewPanel.currentPanel
	}

	public dispose(): void {
		DocumentationViewPanel.currentPanel = undefined
		for (const subscription of this.subscriptions) {
			subscription.dispose()
		}
	}
}
