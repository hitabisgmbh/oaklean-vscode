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

	private getImageWhitelist() {
		const config = vscode.workspace.getConfiguration('oaklean')
		return config.get<string[]>('docs.imageWhitelist', [])
	}

	private getImageCspSources(whitelist: string[]) {
		const sources = new Set<string>()
		for (const entry of whitelist) {
			const trimmed = entry.trim()
			if (!trimmed) continue
			const lower = trimmed.toLowerCase()
			if (lower.startsWith('http(s)://')) {
				const rest = trimmed.slice('http(s)://'.length)
				const host = rest.split('/')[0]
				if (host) {
					sources.add(`http://${host}`)
					sources.add(`https://${host}`)
				}
				continue
			}
			if (lower.startsWith('http://') || lower.startsWith('https://')) {
				const wildcardIndex = trimmed.indexOf('*')
				if (wildcardIndex !== -1) {
					const scheme = lower.startsWith('https://') ? 'https' : 'http'
					const host = trimmed.replace(/^https?:\/\//i, '').split('/')[0]
					if (host) {
						sources.add(`${scheme}://${host}`)
					}
					continue
				}
				try {
					const url = new URL(trimmed)
					sources.add(`${url.protocol}//${url.host}`)
				} catch {
					// ignore invalid entries
				}
				continue
			}
			const wildcardHost = trimmed.replace(/^\*\./, '').replace(/^\*/, '')
			if (wildcardHost) {
				sources.add(`http://*.${wildcardHost}`)
				sources.add(`https://*.${wildcardHost}`)
				sources.add(`http://${wildcardHost}`)
				sources.add(`https://${wildcardHost}`)
			}
		}
		return Array.from(sources).join(' ')
	}

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _container: Container
	) {}

	dispose(): void {
		// Nothing to dispose yet
	}

	private _getHtmlForWebview(
		webview: vscode.Webview,
		extensionUri: vscode.Uri,
		imageCspSources: string
	) {
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

		const imgSrc = imageCspSources ? ` ${imageCspSources}` : ''

		return /* html */ `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<meta http-equiv="Content-Security-Policy" content="
					default-src 'none';
					img-src ${webview.cspSource} data:${imgSrc};
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
		const imageWhitelist = this.getImageWhitelist()
		const imageCspSources = this.getImageCspSources(imageWhitelist)

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'webpack'),
				this._extensionUri
			]
		}

		webviewView.webview.html = this._getHtmlForWebview(
			webviewView.webview,
			this._extensionUri,
			imageCspSources
		)

		this.initializeWebview(webviewView.webview)
	}

	private initializeWebview(webview: vscode.Webview) {
		webview.onDidReceiveMessage(async (message: DocumentationView_ChildToParent) => {
			switch (message?.type) {
				case DocumentationViewCommands.requestDocs:
					await this.sendInit(webview)
					break
				case DocumentationViewCommands.openFile:
					webview.postMessage({
						type: DocumentationViewCommands.open,
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
		const imageWhitelist = this.getImageWhitelist()
		webview.postMessage({
			type: DocumentationViewCommands.init,
			files: docs,
			initialFile,
			resourceBase,
			imageWhitelist
		})
	}
}
