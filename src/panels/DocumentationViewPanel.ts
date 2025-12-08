import vscode from 'vscode'

import { getNonce } from '../utilities/getNonce'
import { Container } from '../container'

export class DocumentationViewPanel {
	public static currentPanel: DocumentationViewPanel | undefined
	private readonly _panel: vscode.WebviewPanel
	private subscriptions: vscode.Disposable[] = []

	private constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _container: Container
	) {
		this.subscriptions.push(
			(this._panel = vscode.window.createWebviewPanel(
				'Documentation',
				'Documentation',
				vscode.ViewColumn.Beside,
				{
					enableScripts: true,
					retainContextWhenHidden: true
				}
			)),
			this._panel.onDidDispose(() => this.dispose())
		)

		this._panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		}

		this.refresh()
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

	private refresh() {
		this._panel.webview.html = this._getHtmlForWebview()
	}

	private _getHtmlForWebview() {
		const nonce = getNonce()
		// for now, a simple placeholder HTML page
		return `
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width,initial-scale=1.0">
					<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}' 'unsafe-inline'; script-src 'nonce-${nonce}';">
					<title>Oaklean Documentation</title>
					<style nonce="${nonce}">
						body { font-family: sans-serif; padding: 16px; }
						h1 { margin-top: 0; }
						.placeholder { color: #666; }
					</style>
				</head>
				<body>
					<h1>Oaklean Documentation</h1>
					<p class="placeholder">Documentation UI will follow :)</p>
				</body>
			</html>
		`
	}
}
