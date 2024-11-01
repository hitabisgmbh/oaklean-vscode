import * as vscode from 'vscode'
import {
	ModelMap,
	PathID_number,
	PathIndex,
	ProjectReport,
	SourceFileMetaData,
	SourceNodeIdentifier_string,
	UnifiedPath
} from '@oaklean/profiler-core'

import WorkspaceUtils from '../helper/WorkspaceUtils'
import { getNonce } from '../utilities/getNonce'
import { getUri } from '../utilities/getUri'
import { Container } from '../container'
import {
	FilterPathChangeEvent,
	SelectedSensorValueRepresentationChangeEvent,
	SortDirectionChangeEvent
} from '../helper/EventHandler'
import { MethodViewMessageTypes } from '../types/methodViewMessageTypes'
import { MethodViewCommands } from '../types/methodViewCommands'
import { SortDirection } from '../types/sortDirection'
import {
	MethodViewProtocol_ChildToParent,
	MethodViewProtocol_ParentToChild
} from '../protocols/methodViewProtocol'
import { MethodList } from '../model/MethodList'
import { SensorValueRepresentation } from '../types/sensorValueRepresentation'

export class MethodViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'methodView'
	private _view?: vscode.WebviewView
	report: ProjectReport | undefined
	_container: Container
	constructor(private readonly _extensionUri: vscode.Uri, container: Container) {
		this._container = container
		container.eventHandler.onSelectedSensorValueTypeChange(this.selectedSensorValueTypeChanged.bind(this))
		container.eventHandler.onFilterPathChange(this.filterPathChange.bind(this))
		container.eventHandler.onSortDirectionChange(this.sortDirectionChange.bind(this))
		container.eventHandler.onReportPathChange(this.reportPathChanged.bind(this))
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView

		webviewView.webview.options = {
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		}
		this._view.webview.onDidReceiveMessage(
			(message: MethodViewProtocol_ChildToParent) => {
				if (message.command === MethodViewCommands.openMethod) {
					const identifier = message.identifier
					const filePath = vscode.window.activeTextEditor?.document.uri.fsPath
					if (filePath){
						this.openMethodInEditor(identifier, filePath)
					}
				} else if (message.command === MethodViewCommands.initMethods) {
					this.fillMethodView()
				}
			}
		)
		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, this._extensionUri)

	}

	fillMethodView() {
		this.report = this._container.textDocumentController.projectReport
		let internMeasurements: ModelMap<PathID_number, SourceFileMetaData> | undefined
		const methodLists: MethodList[] = []
		if (this.report !== undefined) {
			internMeasurements = this.report.intern
			const reversedInternMapping = this.report.reversedInternMapping
			for (const [pathID, sourceFileMetaData] of internMeasurements.entries()) {
				if (sourceFileMetaData && sourceFileMetaData.pathIndex.file) {
					const foundKey = reversedInternMapping.get(pathID)

					const originalPathIndex = foundKey === undefined ?
						undefined :
						this.report.getPathIndexByID(foundKey)

					let lastCnt = 0
					if (methodLists.length > 0) {
						lastCnt = methodLists[methodLists.length - 1].lastCnt
					}
					const methodList = new MethodList(sourceFileMetaData, lastCnt, originalPathIndex)
					methodLists.push(methodList)
				}
			}
		}
		const sensorValueRepresentation = this._container.storage.getWorkspace('sensorValueRepresentation') as SensorValueRepresentation
		const includedFilterPath = this._container.storage.getWorkspace('includedFilterPath') as string
		const excludedFilterPath = this._container.storage.getWorkspace('excludedFilterPath') as string
		const sortDirection = this._container.storage.getWorkspace('sortDirection') as SortDirection
		methodLists.forEach((methodList) => {
			if (methodList.methods.length > 0) {
				this.postMessageToWebview({
					type: MethodViewMessageTypes.displayMethods,
					methodList,
					sensorValueRepresentation,
					filterPaths: { includedFilterPath, excludedFilterPath }
				})
			}
		})
		if (sortDirection !== (SortDirection.default || undefined)) {
			this.postMessageToWebview({
				type: MethodViewMessageTypes.sortDirectionChange,
				sortDirection
			})
		}


	}

	reportPathChanged() {
		this.fillMethodView()
	}

	public postMessageToWebview(message: MethodViewProtocol_ParentToChild) {
		this._view?.webview.postMessage(message)
	}

	selectedSensorValueTypeChanged(event: SelectedSensorValueRepresentationChangeEvent) {
		const sensorValueRepresentation = event.sensorValueRepresentation
		this.postMessageToWebview({
			type: MethodViewMessageTypes.sensorValueTypeChange,
			sensorValueRepresentation
		})
	}

	sortDirectionChange(event: SortDirectionChangeEvent) {
		const sortDirection = event.sortDirection
		this.postMessageToWebview({
			type: MethodViewMessageTypes.sortDirectionChange,
			sortDirection
		})
	}

	filterPathChange(event: FilterPathChangeEvent) {
		this.postMessageToWebview({
			type: MethodViewMessageTypes.filterPathChange,
			filterPaths: event.filterPaths
		})
	}

	async openMethodInEditor(identifier: string, filePath: string) {
		const unifiedFilePath = new UnifiedPath(filePath)
		const absolutePath = new UnifiedPath(filePath)
		const uri = vscode.Uri.file(absolutePath?.toString() || '')
		const errorMessage = `Could not find file: ${filePath}`
		try {
			if (absolutePath) {
				const document = await vscode.workspace.openTextDocument(uri)

				if (document) {

					const programStructureTreeOfFile =
						this._container.textDocumentController.getProgramStructureTreeOfFile(unifiedFilePath)
					let position
					if (programStructureTreeOfFile) {
						const sourceIdentifierString = identifier.replace(/"/g, '') as SourceNodeIdentifier_string
						const loc = programStructureTreeOfFile.sourceLocationOfIdentifier(sourceIdentifierString)
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
				console.error(errorMessage)
				vscode.window.showErrorMessage(errorMessage)
			}
		} catch (error) {
			vscode.window.showErrorMessage(errorMessage)
			console.error(errorMessage)
		}
	}

	private _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri) {
		const nonce = getNonce()
		const webviewUri = getUri(webview, extensionUri, ['dist', 'webview', 'MethodView.js'])
		const stylesUri = getUri(webview, extensionUri, ['dist', 'webview', 'methodView.css'])
		const codiconsUri = getUri(webview, extensionUri, ['dist', 'webview', 'codicons', 'codicon.css'])
		const htmlContent = `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1.0">
						<meta http-equiv="Content-Security-Policy"
						content="default-src 'none';
						font-src ${webview.cspSource}; 
						style-src ${webview.cspSource} 'unsafe-inline';
						script-src 'nonce-${nonce}';">
						<link rel="stylesheet" href="${stylesUri}">
						<link rel="stylesheet" href="${codiconsUri}">
            <title>Methods</title>
          </head>
          <body>
		  			<div id="content"></div>
						<script type="module" nonce="${nonce}" src="${webviewUri}"></script>
						</body>
					</html>
    `

		return htmlContent
	}
}
