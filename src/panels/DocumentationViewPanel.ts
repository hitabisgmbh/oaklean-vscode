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

	private constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _container: Container
	) {
		this._panel = vscode.window.createWebviewPanel(
			DocumentationViewPanel.viewType,
			'Oaklean Documentation',
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		)

		this.subscriptions.push(
			this.webViewProvider = new DocumentationViewProvider(this._extensionUri, this._container)
		)
		this.webViewProvider.resolveWebviewView(
			{ webview: this._panel.webview } as vscode.WebviewView,
			{} as vscode.WebviewViewResolveContext,
			{} as vscode.CancellationToken
		)
		

		this.subscriptions.push(
			this._panel,
			this._panel.onDidDispose(() => this.dispose())
		)

		this._panel.onDidChangeViewState(() => {
			this._panel.webview.postMessage({ type: DocumentationViewCommands.requestDocs })
		})
	}

	public static render(container: Container) {
		if (DocumentationViewPanel.currentPanel) {
			DocumentationViewPanel.currentPanel._panel.reveal()
		} else {
			DocumentationViewPanel.currentPanel = new DocumentationViewPanel(
				container.context.extensionUri,
				container
			)
		}
		return DocumentationViewPanel.currentPanel
	}

	public dispose() {
		DocumentationViewPanel.currentPanel = undefined
		this.subscriptions.forEach((d) => d.dispose())
	}
}
