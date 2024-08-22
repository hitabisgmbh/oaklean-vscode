import * as vscode from 'vscode'
import { SourceNodeIdentifier_string, ProjectReport, UnifiedPath } from '@oaklean/profiler-core'
import { TextEditor } from 'vscode'

import { getNonce } from '../utilities/getNonce'
import { getUri } from '../utilities/getUri'
import { Container } from '../container'
import WorkspaceUtils from '../helper/WorkspaceUtils'
import { SelectedSensorValueRepresentationChangeEvent, TextEditorChangeEvent } from '../helper/EventHandler'
import { EditorFileMethodViewProtocol_ParentToChild, EditorFileMethodViewCommands } from '../protocols/editorFileMethodViewProtocol'
import { SensorValueRepresentation } from '../types/sensorValueRepresentation'
export class EditorFileMethodViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'editorFileMethodView'
	private _view?: vscode.WebviewView
	_container: Container
	editor: TextEditor | undefined
	report: ProjectReport | undefined
	constructor(private readonly _extensionUri: vscode.Uri,
		container: Container) {
		this._container = container
		this._container.eventHandler.onTextEditorChange(this.textEditorChanged.bind(this))
		this._container.eventHandler.onSelectedSensorValueTypeChange(this.selectedSensorValueTypeChanged.bind(this))
		this._container.eventHandler.onReportPathChange(this.reportPathChanged.bind(this))
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
			this.createMethodList()
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
			(message: { command: 'open', identifier: string }) => {
				if (message.command === 'open') {
					const identifier = message.identifier
					if (identifier) {
						this.openMethodInEditor(identifier)
					}
				} else if (message.command === 'initMethods') {
					this.createMethodList()
				}
			}
		)
		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview,
			this._extensionUri)
	}

	reportPathChanged() {
		this.createMethodList()
	}

	getMethodList() {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!this.editor || !workspaceDir) {
			return
		}
		const reportFilePath = this._container.storage.getWorkspace('reportPath') as string

		if (reportFilePath) {
			const sourceFilePath = new UnifiedPath(this.editor.document.fileName)
			this.report = this._container.textDocumentController.projectReport
			const sourceFileMetaData = this.report?.getMetaDataFromFile(
				new UnifiedPath(reportFilePath.toString()),
				new UnifiedPath(sourceFilePath.toString())
			)

			return sourceFileMetaData
		}
	}

	public postMessageToWebview(message: EditorFileMethodViewProtocol_ParentToChild) {
		this._view?.webview.postMessage(message)
	}



	textEditorChanged(event: TextEditorChangeEvent) {
		this.setEditor(event.editor)
	}

	setEditor(editor: TextEditor) {
		this.editor = editor
		this.createMethodList()
	}

	createMethodList() {
		const methodList = this.getMethodList()
		if (methodList) {
			const sensorValueRepresentation =
				this._container.storage.getWorkspace('sensorValueRepresentation') as SensorValueRepresentation
			if (methodList?.pathIndex.file !== undefined) {
				const pathIndex = methodList.pathIndex
				this.postMessageToWebview({
					command: EditorFileMethodViewCommands.createMethodList,
					methodList, pathIndex, sensorValueRepresentation
				})
			}
		} else {
			this.postMessageToWebview({
				command: EditorFileMethodViewCommands.createMethodList,
				methodList: undefined, pathIndex: undefined, sensorValueRepresentation: undefined
			})
		}
	}

	async openMethodInEditor(identifier: string) {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!this.editor || !workspaceDir) {
			return
		}
		const filePathRelativeToWorkspace = workspaceDir.pathTo(this.editor.document.fileName)
		const absolutePath = WorkspaceUtils.getFileFromWorkspace(filePathRelativeToWorkspace.toString())
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

	selectedSensorValueTypeChanged(event: SelectedSensorValueRepresentationChangeEvent) {
		const sensorValueRepresentation = event.sensorValueRepresentation
		const methodList = this.getMethodList()
		if (methodList?.pathIndex.file !== undefined) {
			const pathIndex = methodList.pathIndex
			this.postMessageToWebview({
				command: EditorFileMethodViewCommands.createMethodList,
				methodList, pathIndex, sensorValueRepresentation
			})
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri) {
		// Use a nonce to only allow specific scripts to be run
		const nonce = getNonce()
		const webviewUri = getUri(webview, extensionUri, ['dist', 'webview', 'EditorFileMethodView.js'])
		const stylesUri = getUri(webview, extensionUri, ['dist', 'webview', 'editorFileMethodView.css'])
		const codiconsUri = getUri(webview, extensionUri, ['dist', 'webview', 'codicons', 'codicon.css'])
		const htmlContent = `<!DOCTYPE html>
        <html lang="en">
          <head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width,initial-scale=1.0">
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src ${webview.cspSource}; 
			style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
			<link rel="stylesheet" href="${stylesUri}">
			<link rel="stylesheet" href="${codiconsUri}">
            <title>Files Methods</title>
          </head>
          <body>
		  	<div id="method-list"></div>
          <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
          </body>
        </html>
    `

		return htmlContent
	}
}

