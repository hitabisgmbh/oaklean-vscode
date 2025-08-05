import * as vscode from 'vscode'
import { SourceNodeIdentifier_string } from '@oaklean/profiler-core'
import { TextEditor } from 'vscode'

import { getNonce } from '../utilities/getNonce'
import { getUri } from '../utilities/getUri'
import { Container } from '../container'
import WorkspaceUtils from '../helper/WorkspaceUtils'
import {
	TextEditorChangeEvent,
	TextEditorsChangeVisibilityEvent
} from '../helper/EventHandler'
import {
	EditorFileMethodViewProtocol_ParentToChild,
	EditorFileMethodViewCommands
} from '../protocols/EditorFileMethodViewProtocol'
import { SensorValueRepresentation } from '../types/sensorValueRepresentation'
import { SourceFileMethodTree } from '../model/SourceFileMethodTree'
import OpenSourceLocationCommand from '../commands/OpenSourceLocationCommand'
import { OpenSourceLocationCommandIdentifiers } from '../types/commands/OpenSourceLocationCommand'
export class EditorFileMethodViewProvider
	implements vscode.WebviewViewProvider {
	private subscriptions: vscode.Disposable[] = []

	public static readonly viewType = 'editorFileMethodView'
	private _view?: vscode.WebviewView
	_container: Container
	editor: TextEditor | undefined
	constructor(
		private readonly _extensionUri: vscode.Uri,
		container: Container
	) {
		this._container = container
		this.subscriptions = [
			this._container.eventHandler.onTextEditorChange(
				this.textEditorChanged.bind(this)
			),
			this._container.eventHandler.onTextEditorsChangeVisibility(
				this.onTextEditorsChangeVisibility.bind(this)
			),
			this._container.eventHandler.onSelectedSensorValueTypeChange(
				this.refresh.bind(this)
			),
			this._container.eventHandler.onReportLoaded(this.refresh.bind(this)),
			this._container.eventHandler.onWebpackRecompile(
				this.hardRefresh.bind(this)
			)
		]
	}

	dispose() {
		this.subscriptions.forEach((d) => d.dispose())
		this.subscriptions = []
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView
		this.subscriptions.push(
			this._view.onDidChangeVisibility(this.hardRefresh.bind(this)),
			this._view.webview.onDidReceiveMessage(
				this.receiveMessageFromWebview.bind(this)
			)
		)

		webviewView.webview.options = {
			// Enable scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				// Allow the webview to access resources in the workspace
				this._extensionUri
			]
		}

		webviewView.webview.html = this._getHtmlForWebview(
			webviewView.webview,
			this._extensionUri
		)
	}

	getSourceFileMetaData() {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!this.editor || !workspaceDir) {
			return
		}
		const filePathRelativeToWorkspace = workspaceDir.pathTo(
			this.editor.document.fileName
		)
		return this._container.textDocumentController.getSourceFileMetaData(
			filePathRelativeToWorkspace
		)
	}

	receiveMessageFromWebview(message: {
		command: EditorFileMethodViewCommands
		identifier: string
	}) {
		if (message.command === EditorFileMethodViewCommands.open) {
			const identifier = message.identifier
			if (identifier && this.editor) {
				OpenSourceLocationCommand.execute({
					command: OpenSourceLocationCommandIdentifiers.openSourceLocation,
					args: {
						filePath: this.editor.document.fileName,
						sourceNodeIdentifier: identifier as SourceNodeIdentifier_string
					}
				})
			}
		} else if (message.command === EditorFileMethodViewCommands.initMethods) {
			this.refresh()
		}
	}

	public postMessageToWebview(
		message: EditorFileMethodViewProtocol_ParentToChild
	) {
		this._view?.webview.postMessage(message)
	}

	onTextEditorsChangeVisibility(event: TextEditorsChangeVisibilityEvent) {
		if (event.editors.length === 0) {
			this.editor = undefined
			this.refresh()
		}
	}

	textEditorChanged(event: TextEditorChangeEvent) {
		this.setEditor(event.editor)
	}

	setEditor(editor: TextEditor) {
		this.editor = editor
		this.refresh()
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
		const sourceFileMetaData = this.getSourceFileMetaData()
		if (sourceFileMetaData === undefined) {
			this.postMessageToWebview({
				command: EditorFileMethodViewCommands.clearMethodList
			})
			return
		}
		const sourceFileMethodTree =
			SourceFileMethodTree.fromSourceFileMetaData(sourceFileMetaData)

		const sensorValueRepresentation = this._container.storage.getWorkspace(
			'sensorValueRepresentation'
		) as SensorValueRepresentation
		this.postMessageToWebview({
			command: EditorFileMethodViewCommands.updateMethodList,
			sourceFileMethodTree: sourceFileMethodTree.toJSON(),
			sensorValueRepresentation
		})
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
			'EditorFileMethodView.js'
		])
		const stylesUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'EditorFileMethodView.css'
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

		const mediaPath = getUri(webview, extensionUri, ['media'])

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
								img-src ${webview.cspSource};
								style-src 'unsafe-inline' ${webview.cspSource};
								style-src-elem 'unsafe-inline' ${webview.cspSource};
								script-src 'nonce-${nonce}';
							"
						>
						<link rel="stylesheet" href="${stylesUri}">
						<link rel="stylesheet" href="${codiconsUri}">
            <title>Files Methods</title>
						<script nonce="${nonce}">
							window.__MEDIA_PATH__ = "${mediaPath}";
						</script>
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
