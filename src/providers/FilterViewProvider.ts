import * as vscode from 'vscode'

import { getNonce } from '../utilities/getNonce'
import { getUri } from '../utilities/getUri'
import { Container } from '../container'
import {
	FilterViewCommands,
	FilterViewProtocol_ChildToParent,
	FilterViewProtocol_ParentToChild
} from '../protocols/filterViewProtocol'

export class FilterViewProvider implements vscode.WebviewViewProvider {
	private subscriptions: vscode.Disposable[] = []

	public static readonly viewType = 'filterView'

	private _view?: vscode.WebviewView
	_container: Container
	constructor(
		private readonly _extensionUri: vscode.Uri,
		container: Container
	) {
		this._container = container
		this.subscriptions = [
			this._container.eventHandler.onWebpackRecompile(this.hardRefresh.bind(this))
		]
	}

	dispose() {
		this.subscriptions.forEach((d) => d.dispose())
	}

	public postMessageToWebview(message: FilterViewProtocol_ParentToChild) {
		this._view?.webview.postMessage(message)
	}

	hardRefresh() {
		if (this._view === undefined) {
			return
		}
		this._view.webview.html = this._getHtmlForWebview(
			this._view.webview,
			this._extensionUri
		)
		this.refresh()
	}

	refresh() {
		const includedFilterPath =
			(this._container.storage.getWorkspace('includedFilterPath') as string) ||
			''
		const excludedFilterPath =
			(this._container.storage.getWorkspace('excludedFilterPath') as string) ||
			''

		this.postMessageToWebview({
			command: FilterViewCommands.renderFilterView,
			filePaths: {
				includedFilterPath,
				excludedFilterPath
			}
		})
	}

	receiveMessageFromWebview(message: FilterViewProtocol_ChildToParent) {
		if (message.command === FilterViewCommands.viewLoaded) {
			this.refresh()
			}

		if (message.command === FilterViewCommands.includedFilterPathEdited) {
			this._container.storage.storeWorkspace(
				'includedFilterPath',
				message.includedFilterPath
			)
		}
		if (message.command === FilterViewCommands.excludedFilterPathEdited) {
			this._container.storage.storeWorkspace(
				'excludedFilterPath',
				message.excludedFilterPath
			)
		}
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView

		webviewView.webview.options = {
			// Enable scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				// Allow the webview to access resources in the workspace
				this._extensionUri
			]
		}

		this.subscriptions.push(
			this._view.webview.onDidReceiveMessage(
				this.receiveMessageFromWebview.bind(this)
			)
		)
		
		webviewView.webview.html = this._getHtmlForWebview(
			webviewView.webview,
			this._extensionUri
		)
	}

	private _getHtmlForWebview(
		webview: vscode.Webview,
		extensionUri: vscode.Uri
	) {
		// Use a nonce to only allow specific scripts to be run
		const nonce = getNonce()
		const webviewUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'FilterView.js'
		])
		const vendorsUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'vendors.js'
		])
		const stylesUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'FilterView.css'
		])
		const htmlContent = `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1.0">
						<meta
							http-equiv="Content-Security-Policy"
							content="
								default-src 'none';
								font-src ${webview.cspSource};
								style-src 'unsafe-inline' ${webview.cspSource};
								style-src-elem 'unsafe-inline' ${webview.cspSource};
								script-src 'nonce-${nonce}';
							"
						>
						<link rel="stylesheet" href="${stylesUri}">
            <title>Filter</title>
          </head>
          <body>
						<div id="root"></div>
						<script nonce="${nonce}" src="${vendorsUri}"></script>
						<script nonce="${nonce}" src="${webviewUri}"></script>
          </body>
        </html>
    `

		return htmlContent
	}
}
