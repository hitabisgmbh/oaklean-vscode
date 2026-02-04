import * as path from 'path'

import vscode, { WebviewView, WebviewViewProvider } from 'vscode'

import { getUri } from '../utilities/getUri'
import { getNonce } from '../utilities/getNonce'
import { Container } from '../container'
import {
	SEARCH_MAX_RESULTS_CONFIG_KEY,
	SEARCH_PAGE_SIZE_CONFIG_KEY,
	SEARCH_RESULTS_MAX_DEFAULT,
	SEARCH_RESULTS_MAX_MIN,
	SEARCH_RESULTS_PAGE_SIZE_DEFAULT,
	SEARCH_RESULTS_PAGE_SIZE_MIN
} from '../constants/documentationSearch'
import { DOCUMENTATION_README_FILE_NAME } from '../constants/documentationTree'
import {
	DocumentationViewCommands,
	DocumentationView_ChildToParent
} from '../protocols/DocumentationViewProtocol'

export class DocumentationViewProvider
	implements WebviewViewProvider, vscode.Disposable
{
	public static readonly viewType = 'oaklean.documentationView'

	// Input: none. Output: image whitelist from settings (string[]).
	private getImageWhitelist() {
		const config = vscode.workspace.getConfiguration('oaklean')
		return config.get<string[]>('docs.imageWhitelist', [])
	}

	// Input: none. Output: validated max results value.
	private getSearchMaxResults(): number {
		const config = vscode.workspace.getConfiguration('oaklean')
		const value = config.get<number>(SEARCH_MAX_RESULTS_CONFIG_KEY)
		if (value === undefined || Number.isNaN(value)) {
			return SEARCH_RESULTS_MAX_DEFAULT
		}
		const rounded = Math.floor(value)
		if (rounded < SEARCH_RESULTS_MAX_MIN) {
			return SEARCH_RESULTS_MAX_MIN
		}
		return rounded
	}

	// Input: none. Output: validated page size value.
	private getSearchPageSize(): number {
		const config = vscode.workspace.getConfiguration('oaklean')
		const value = config.get<number>(SEARCH_PAGE_SIZE_CONFIG_KEY)
		if (value === undefined || Number.isNaN(value)) {
			return SEARCH_RESULTS_PAGE_SIZE_DEFAULT
		}
		const rounded = Math.floor(value)
		if (rounded < SEARCH_RESULTS_PAGE_SIZE_MIN) {
			return SEARCH_RESULTS_PAGE_SIZE_MIN
		}
		return rounded
	}

	// Input: none. Output: normalized search config (page size capped by max).
	private getSearchConfig(): { maxResults: number; pageSize: number } {
		const maxResults = this.getSearchMaxResults()
		let pageSize = this.getSearchPageSize()
		// Keep page size within the max results range.
		if (pageSize > maxResults) {
			pageSize = maxResults
		}
		return { maxResults, pageSize }
	}

	// Input: whitelist strings. Output: CSP img-src tokens.
	private getImageCspSources(whitelist: string[]) {
		const sources = new Set<string>()
		for (const entry of whitelist) {
			const trimmed = entry.trim()
			if (trimmed === '') {
				continue
			}
			const lower = trimmed.toLowerCase()
			if (lower.startsWith('http(s)://')) {
				const rest = trimmed.slice('http(s)://'.length)
				const host = rest.split('/')[0]
				if (host !== '') {
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
					if (host !== '') {
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
			if (wildcardHost !== '') {
				sources.add(`http://*.${wildcardHost}`)
				sources.add(`https://*.${wildcardHost}`)
				sources.add(`http://${wildcardHost}`)
				sources.add(`https://${wildcardHost}`)
			}
		}
		return Array.from(sources).join(' ')
	}

	// Input: extension URI + container. Output: initialized provider.
	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _container: Container
	) {}

	// Input: none. Output: void (Disposable contract).
	dispose(): void {
		// Nothing to dispose yet
	}

	// Input: webview + extension URI + CSP sources. Output: HTML string.
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

		const imgSrc = imageCspSources === '' ? '' : ` ${imageCspSources}`

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

	// Input: webview view. Output: sets up webview content + handlers.
	resolveWebviewView(webviewView: WebviewView): void | Thenable<void> {
		this.setupWebview(webviewView.webview)
	}

	// Input: webview panel. Output: sets up webview content + handlers.
	public resolveWebviewForPanel(webview: vscode.Webview): void {
		this.setupWebview(webview)
	}

	// Input: webview. Output: registers message handler and sends init.
	private initializeWebview(webview: vscode.Webview) {
		webview.onDidReceiveMessage(
			async (message: DocumentationView_ChildToParent) => {
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
					case DocumentationViewCommands.openMissingFile: {
						const rawPath = (message.path ?? '').replace(/^\/*/, '')
						if (rawPath === '') {
							break
						}
						const docsRoot =
							await this._container.documentationController.getDocsRoot()
						const safeSegments = rawPath
							.split('/')
							.filter(
								(segment) =>
									segment !== '' && segment !== '.' && segment !== '..'
							)
						const targetUri = vscode.Uri.joinPath(docsRoot, ...safeSegments)
						try {
							await vscode.commands.executeCommand('vscode.open', targetUri)
						} catch {
							// ignore
						}
						break
					}
					case DocumentationViewCommands.search:
						// Search is handled client-side in the webview for now.
						break
					case DocumentationViewCommands.openExternal:
						if (message.href !== undefined && message.href !== '') {
							try {
								await vscode.env.openExternal(vscode.Uri.parse(message.href))
							} catch {
								// ignore
							}
						}
						break
				}
			}
		)

		void this.sendInit(webview)
	}

	// Input: webview. Output: assigns HTML, CSP, and local roots.
	private setupWebview(webview: vscode.Webview): void {
		const imageWhitelist = this.getImageWhitelist()
		const imageCspSources = this.getImageCspSources(imageWhitelist)

		webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'webpack'),
				this._extensionUri
			]
		}

		webview.html = this._getHtmlForWebview(
			webview,
			this._extensionUri,
			imageCspSources
		)

		this.initializeWebview(webview)
	}

	// Input: webview. Output: posts init payload to the webview.
	private async sendInit(webview: vscode.Webview) {
		const docs = await this._container.documentationController.getAllDocs()
		if (docs === undefined || docs.length === 0) {
			return
		}
		const rootReadme = docs.find((doc) => {
			const isReadme = doc.name.toLowerCase() === DOCUMENTATION_README_FILE_NAME
			const isRootDoc = doc.path.includes(path.posix.sep) === false
			return isReadme && isRootDoc
		})
		const initialFile =
			rootReadme === undefined ? docs[0].path : rootReadme.path
		const docsRoot = await this._container.documentationController.getDocsRoot()
		const docsRootParent = docsRoot.with({
			path: path.posix.dirname(docsRoot.path)
		})
		const docsBasePath = path.posix.relative(docsRootParent.path, docsRoot.path)
		const resourceBase = webview.asWebviewUri(docsRootParent).toString()
		const imageWhitelist = this.getImageWhitelist()
		const searchConfig = this.getSearchConfig()
		webview.postMessage({
			type: DocumentationViewCommands.init,
			files: docs,
			initialFile,
			resourceBase,
			docsBasePath,
			imageWhitelist,
			searchMaxResults: searchConfig.maxResults,
			searchPageSize: searchConfig.pageSize
		})
	}
}
