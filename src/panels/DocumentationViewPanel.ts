import vscode from 'vscode'

import { Container } from '../container'
import { DocumentationViewProvider } from '../WebViewProviders/DocumentationViewProvider'
import { DocumentationViewCommands } from '../protocols/DocumentationViewProtocol'

export class DocumentationViewPanel {
	public static currentPanel: DocumentationViewPanel | undefined
	private readonly _panel: vscode.WebviewPanel
	private subscriptions: vscode.Disposable[] = []

	private constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _container: Container
	) {
		this._panel = vscode.window.createWebviewPanel(
			DocumentationViewProvider.viewType,
			'Oaklean Documentation',
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				localResourceRoots: [
					vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'webpack'),
					this._extensionUri
				],
				retainContextWhenHidden: true
			}
		)

		this.subscriptions.push(
			this._panel,
			this._panel.onDidDispose(() => this.dispose())
		)

		this._panel.webview.html = DocumentationViewProvider.buildHtml(
			this._panel.webview,
			this._extensionUri
		)

		this._container.documentationViewProvider.initializeWebview(this._panel.webview)

		this._panel.onDidChangeViewState(() => {
			this._panel.webview.postMessage({ command: DocumentationViewCommands.requestDocs })
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
