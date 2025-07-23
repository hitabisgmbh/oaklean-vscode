import * as vscode from 'vscode'
import { SourceNodeIdentifier_string } from '@oaklean/profiler-core'
import { TextEditor } from 'vscode'

import { getNonce } from '../utilities/getNonce'
import { getUri } from '../utilities/getUri'
import { Container } from '../container'
import WorkspaceUtils from '../helper/WorkspaceUtils'
import { TextEditorChangeEvent } from '../helper/EventHandler'
import {
	EditorFileMethodViewProtocol_ParentToChild,
	EditorFileMethodViewCommands
} from '../protocols/editorFileMethodViewProtocol'
import { SensorValueRepresentation } from '../types/sensorValueRepresentation'
import { SourceFileMethodTree } from '../model/SourceFileMethodTree'
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
			this._container.eventHandler.onSelectedSensorValueTypeChange(
				this.refresh.bind(this)
			),
			this._container.eventHandler.onReportLoaded(this.refresh.bind(this)),
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
		this._view.onDidChangeVisibility(() => {
			webviewView.webview.html = this._getHtmlForWebview(webviewView.webview,
				this._extensionUri)
			this.refresh()
		})
		webviewView.webview.options = {
			// Enable scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				// Allow the webview to access resources in the workspace
				this._extensionUri
			]
		}

		this._view.webview.onDidReceiveMessage(
			(message: { command: EditorFileMethodViewCommands, identifier: string }) => {
				if (message.command === EditorFileMethodViewCommands.open) {
					const identifier = message.identifier
					if (identifier) {
						this.openMethodInEditor(identifier)
					}
				} else if (message.command === EditorFileMethodViewCommands.initMethods) {
					this.refresh()
				}
			}
		)
		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview,
			this._extensionUri)
	}

	getSourceFileMetaData() {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!this.editor || !workspaceDir) {
			return
		}
		const filePathRelativeToWorkspace = workspaceDir.pathTo(this.editor.document.fileName)
		return this._container.textDocumentController.getSourceFileMetaData(filePathRelativeToWorkspace)
	}

	public postMessageToWebview(message: EditorFileMethodViewProtocol_ParentToChild) {
		this._view?.webview.postMessage(message)
	}

	textEditorChanged(event: TextEditorChangeEvent) {
		this.setEditor(event.editor)
	}

	setEditor(editor: TextEditor) {
		this.editor = editor
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
		const sourceFileMethodTree = SourceFileMethodTree.fromSourceFileMetaData(sourceFileMetaData)

		const sensorValueRepresentation =
				this._container.storage.getWorkspace('sensorValueRepresentation') as SensorValueRepresentation
		this.postMessageToWebview({
			command: EditorFileMethodViewCommands.createMethodList,
			sourceFileMethodTree: sourceFileMethodTree.toJSON(),
			sensorValueRepresentation
		})
	}

	async openMethodInEditor(identifier: string) {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!this.editor || !workspaceDir) {
			return
		}
		const filePathRelativeToWorkspace = workspaceDir.pathTo(this.editor.document.fileName)
		const absolutePath = this.editor.document.fileName
		const uri = vscode.Uri.file(absolutePath?.toString() || '')
		try {
			if (absolutePath) {
				const document = await vscode.workspace.openTextDocument(uri)
				if (document) {
					const programStructureTreeOfFile =
						this._container.textDocumentController.getProgramStructureTreeOfFile(
							filePathRelativeToWorkspace)
					let position
					if (programStructureTreeOfFile) {
						const loc =
							programStructureTreeOfFile.sourceLocationOfIdentifier(
								identifier as SourceNodeIdentifier_string)
						if (loc) {
							position = new vscode.Position(loc.beginLoc.line - 1, loc.beginLoc.column)
						}
					}
					if (position) {
						await vscode.window.showTextDocument(document,
							{ selection: new vscode.Range(position, position) })
					} else {
						await vscode.window.showTextDocument(document)
					}

				}

			} else {
				console.error(`Could not find file: ${filePathRelativeToWorkspace.toString()}`)
			}
		} catch (error) {
			console.error(`Could not open file: ${error}`)
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri) {
		// Use a nonce to only allow specific scripts to be run
		const nonce = getNonce()
		const webviewUri = getUri(webview, extensionUri, ['dist', 'webview', 'webpack', 'EditorFileMethodView.js'])
		const stylesUri = getUri(webview, extensionUri, ['dist', 'webview', 'webpack', 'EditorFileMethodView.css'])
		const vendorsUri = getUri(webview, extensionUri, ['dist', 'webview', 'webpack', 'vendors.js'])
		const codiconsUri = getUri(webview, extensionUri, ['dist', 'webview', 'codicons', 'codicon.css'])

		const htmlContent = `<!DOCTYPE html>
        <html lang="en">
          <head>
						<meta charset="UTF-8">
						<meta name="viewport" content="width=device-width,initial-scale=1.0">
						<meta
							http-equiv="Content-Security-Policy"
							content="default-src 'none'; font-src ${webview.cspSource}; 
								style-src ${webview.cspSource}; script-src 'nonce-${nonce}';"
						>
						<link rel="stylesheet" href="${stylesUri}">
						<link rel="stylesheet" href="${codiconsUri}">
            <title>Files Methods</title>
          </head>
          <body>
						<div id="root"></div>
						<script type="module" nonce="${nonce}" src="${vendorsUri}"></script>
						<script type="module" nonce="${nonce}" src="${webviewUri}"></script>
          </body>
        </html>
    `

		return htmlContent
	}
}

