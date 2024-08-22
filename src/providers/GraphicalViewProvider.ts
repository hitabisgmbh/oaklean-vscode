import * as vscode from 'vscode'

import { getNonce } from '../utilities/getNonce'
import { Container } from '../container'

export class GraphicalViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'graphicalView'

	private _view?: vscode.WebviewView
	_container: Container
	constructor(private readonly _extensionUri: vscode.Uri, container: Container) {
		this._container = container
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView

		// this._view.webview.onDidReceiveMessage(
		// 	(message: { command: string; text: string }) => {}
		// )

		this._view.onDidChangeVisibility((e: any) => {
			webviewView.webview.html = this._getHtmlForWebview(webviewView.webview,
				this._extensionUri)

		})
		webviewView.webview.options = {
			// Enable scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				// Allow the webview to access resources in the workspace
				this._extensionUri
			]
		}

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview,
			this._extensionUri)
	}

	private _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri) {
		// Use a nonce to only allow specific scripts to be run
		const nonce = getNonce()
		// const webviewUri = getUri(webview, extensionUri, ['dist', 'webview', 'webview.js'])
		// const stylesUri = getUri(webview, extensionUri, ['dist', 'webview', 'graphicalView.css'])
		const htmlContent = `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1.0">
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; 
			style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
            <title>Filter</title>
          </head>
          <body>
          <p>Graphical View</p>
          </body>
        </html>
    `

		return htmlContent
	}
}

