import * as vscode from 'vscode'
import {
	SourceNodeIdentifier_string
} from '@oaklean/profiler-core'

import { getNonce } from '../utilities/getNonce'
import { getUri } from '../utilities/getUri'
import { Container } from '../container'
import {
	MethodViewCommands,
	MethodViewProtocol_ChildToParent,
	MethodViewProtocol_ParentToChild
} from '../protocols/MethodViewProtocol'
import { SourceFileMethodTree } from '../model/SourceFileMethodTree'
import { ISourceFileMethodTree } from '../types/model/SourceFileMethodTree'
import { SensorValueRepresentation } from '../types/sensorValueRepresentation'
import OpenSourceLocationCommand from '../commands/OpenSourceLocationCommand'
import { OpenSourceLocationCommandIdentifiers } from '../types/commands/OpenSourceLocationCommand'

export class MethodViewProvider implements vscode.WebviewViewProvider {
	private subscriptions: vscode.Disposable[] = []

	public static readonly viewType = 'methodView'
	private _view?: vscode.WebviewView
	_container: Container
	constructor(
		private readonly _extensionUri: vscode.Uri,
		container: Container
	) {
		this._container = container
		this.subscriptions = [
			this._container.eventHandler.onSelectedSensorValueTypeChange(this.refresh.bind(this)),
			this._container.eventHandler.onReportLoaded(this.refresh.bind(this)),
			this._container.eventHandler.onWebpackRecompile(this.hardRefresh.bind(this))
		]
	}

	dispose() {
		this.subscriptions.forEach((d) => d.dispose())
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView

		webviewView.webview.options = {
			enableScripts: true,

			localResourceRoots: [this._extensionUri]
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

	receiveMessageFromWebview(message: MethodViewProtocol_ChildToParent) {
		if (message.command === MethodViewCommands.open) {
			const identifier = message.identifier
			const filePath = message.filePath
			OpenSourceLocationCommand.execute(
				{
					command: OpenSourceLocationCommandIdentifiers.openSourceLocation,
					args: {
						filePath,
						sourceNodeIdentifier: identifier as SourceNodeIdentifier_string
					}
				}
			)
		} else if (message.command === MethodViewCommands.initMethods) {
			this.refresh()
		}
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

	public postMessageToWebview(message: MethodViewProtocol_ParentToChild) {
		this._view?.webview.postMessage(message)
	}

	refresh() {
		const projectReport = this._container.textDocumentController.projectReport
		if (projectReport === undefined) {
			return
		}
		const sensorValueRepresentation = this._container.storage.getWorkspace(
					'sensorValueRepresentation'
				) as SensorValueRepresentation

		const sourceFileMethodTrees: Record<string, {
			fileName: string,
			tree: ISourceFileMethodTree
		}>  = {}
		for (const sourceFileMetaData of projectReport.intern.values()) {
			sourceFileMethodTrees[sourceFileMetaData.path] = {
				fileName: sourceFileMetaData.pathIndex.identifier.split('/').pop() || '',
				tree: SourceFileMethodTree.fromSourceFileMetaData(sourceFileMetaData).toJSON()
			}
		}
		this.postMessageToWebview({
			command: MethodViewCommands.clearMethodList
		})
		this.postMessageToWebview({
			command: MethodViewCommands.updateMethodList,
			methodTrees: sourceFileMethodTrees,
			sensorValueRepresentation
		})
	}

	private _getHtmlForWebview(
		webview: vscode.Webview,
		extensionUri: vscode.Uri
	) {
		const nonce = getNonce()
		const webviewUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'MethodView.js'
		])
		const stylesUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'MethodView.css'
		])
		const vendorsUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'vendors.js'
		])
		const codiconsUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'codicons',
			'codicon.css'
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
						<link rel="stylesheet" href="${codiconsUri}">
            <title>Methods</title>
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
