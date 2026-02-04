import vscode from 'vscode'

import { Container } from '../container'
import { DocumentationViewProvider } from '../WebViewProviders/DocumentationViewProvider'
import { DocumentationViewCommands } from '../protocols/DocumentationViewProtocol'

export class DocumentationViewPanel {
	public static readonly viewType = 'oaklean.documentationViewPanel'
	public static currentPanel: DocumentationViewPanel | undefined
	private readonly _panel: vscode.WebviewPanel
	private subscriptions: vscode.Disposable[] = []
	private webViewProvider: DocumentationViewProvider

	// Input: extension URI + container + optional existing panel. Output: initialized panel.
	private constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _container: Container,
		panel?: vscode.WebviewPanel
	) {
		this._panel =
			panel ??
			vscode.window.createWebviewPanel(
				DocumentationViewPanel.viewType,
				'Oaklean Documentation',
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

	// Input: container. Output: singleton panel instance.
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

	// Input: existing panel + container. Output: revived singleton panel.
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

	// Input: none. Output: disposes resources and clears singleton.
	public dispose(): void {
		DocumentationViewPanel.currentPanel = undefined
		for (const subscription of this.subscriptions) {
			subscription.dispose()
		}
	}
}
