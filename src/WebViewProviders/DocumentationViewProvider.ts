import vscode, { WebviewView, WebviewViewProvider, WebviewViewResolveContext, CancellationToken } from 'vscode'

import { getUri } from '../utilities/getUri'
import { getNonce } from '../utilities/getNonce'
import { Container } from '../container'
import {
	DocumentationViewCommands,
	DocumentationView_ChildToParent
} from '../protocols/DocumentationViewProtocol'

export class DocumentationViewProvider implements WebviewViewProvider, vscode.Disposable {
	public static readonly viewType = 'oaklean.documentationView'

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _container: Container
	) {}

	dispose(): void {
		// Nothing to dispose yet
	}

	public static buildHtml(webview: vscode.Webview, extensionUri: vscode.Uri) {
		const scriptUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'DocumentationView.js'
		])
		const stylesUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'DocumentationView.css'
		])
		const vendorsUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'vendors.js'
		])

		const nonce = getNonce()

		return /* html */ `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<meta http-equiv="Content-Security-Policy" content="
					default-src 'none';
					img-src ${webview.cspSource} https: data:;
					style-src ${webview.cspSource} 'unsafe-inline';
					script-src 'nonce-${nonce}';
				">
				<link rel="stylesheet" href="${stylesUri}">
				<title>Oaklean Documentation</title>
			</head>
			<body>
				<div id="root"></div>
				<script nonce="${nonce}" src="${vendorsUri}"></script>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>
		`
	}

	resolveWebviewView(
		webviewView: WebviewView,
		_context: WebviewViewResolveContext<unknown>,
		_token: CancellationToken
	): void | Thenable<void> {
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'webpack'),
				this._extensionUri
			]
		}

		webviewView.webview.html = DocumentationViewProvider.buildHtml(
			webviewView.webview,
			this._extensionUri
		)

		this.initializeWebview(webviewView.webview)
	}

	public initializeWebview(webview: vscode.Webview) {
		webview.onDidReceiveMessage(async (message: DocumentationView_ChildToParent) => {
			switch (message?.command) {
				case DocumentationViewCommands.requestDocs:
					await this.sendInit(webview)
					break
				case DocumentationViewCommands.openFile:
					webview.postMessage({
						command: DocumentationViewCommands.open,
						filePath: message.path,
						anchor: message.anchor
					})
					break
				case DocumentationViewCommands.search:
					// Search is handled client-side in the webview for now.
					break
				case DocumentationViewCommands.openExternal:
					if (message.href) {
						try {
							await vscode.env.openExternal(vscode.Uri.parse(message.href))
						} catch {
							// ignore
						}
					}
					break
			}
		})

		void this.sendInit(webview)
	}

	private async sendInit(webview: vscode.Webview) {
		const docs = await this._container.documentationController.getAllDocs()
		if (!docs || docs.length === 0) {
			return
		}
		const readme = docs.find((d) => d.name.toLowerCase() === 'readme.md')
		const initialFile = readme?.path ?? docs[0].path
		const resourceBase = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'dist', 'extension', 'docs')
		).toString()
		webview.postMessage({
			command: DocumentationViewCommands.init,
			files: docs,
			initialFile,
			resourceBase
		})
	}
}
