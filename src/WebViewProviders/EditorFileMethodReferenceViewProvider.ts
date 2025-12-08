import vscode from 'vscode'

import { getNonce } from '../utilities/getNonce'
import { getUri } from '../utilities/getUri'
import { Container } from '../container'

import {
	EditorFileMethodReferenceViewProtocolCommands,
	EditorFileMethodReferenceViewProtocol_ChildToParent,
	EditorFileMethodReferenceViewProtocol_ParentToChild
} from '../protocols/EditorFileMethodReferenceViewProtocol'

import WorkspaceUtils from '../helper/WorkspaceUtils'

import {
	TextEditorChangeEvent,
	TextEditorsChangeVisibilityEvent
} from '../helper/EventHandler'

import path from 'path'

import { SourceNodeIdentifierHelper } from '@oaklean/profiler-core'
import {
	SourceNodeIdentifier_string,
	ISourceNodeIndex,
	SourceNodeIndexType
} from '@oaklean/profiler-core/dist/src/types'
import { FirstFunctionEntry } from '../protocols/EditorFileMethodReferenceViewProtocol'
import type { UnifiedPath_string } from '@oaklean/profiler-core/dist/src/types'
import { Console } from 'console'

export class EditorFileMethodReferenceViewProvider
	implements vscode.WebviewViewProvider {
	private subscriptions: vscode.Disposable[] = []

	public static readonly viewType = 'editorFileMethodReferenceView'
	
	private _view?: vscode.WebviewView
	_container: Container
	editor: vscode.TextEditor | undefined
	
	constructor(
		private readonly _extensionUri: vscode.Uri,
		container: Container
	) {
		this._container = container
		// In dev, refresh the view when webpack recompiles the webview bundle
		this.subscriptions = [this._container.eventHandler.onWebpackRecompile(
			this.hardRefresh.bind(this)
		), this._container.eventHandler.onTextEditorChange(
			this.textEditorChanged.bind(this)
		), this._container.eventHandler.onTextEditorsChangeVisibility(
			this.onTextEditorsChangeVisibility.bind(this)
		)]
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
		this.editor = vscode.window.activeTextEditor
		this.sendFileName()
		this.sendFirstFunctionName()
	}

	getSourceFileMetaData() {
		if (this.editor === undefined) {
			return null
		}
		const relativeWorkspacePath = WorkspaceUtils.getRelativeWorkspacePath(
			this.editor.document.fileName
		)
		if (relativeWorkspacePath === undefined) {
			return null
		}
		return this._container.textDocumentController.getSourceFileMetaData(
			relativeWorkspacePath
		)
	}

	receiveMessageFromWebview(
		message: EditorFileMethodReferenceViewProtocol_ChildToParent
	) {
		if (message.command === EditorFileMethodReferenceViewProtocolCommands.closeActiveFile) {
			void this.closeActiveFile()
		} else if (message.command === EditorFileMethodReferenceViewProtocolCommands.requestFileName) {
			this.sendFileName()
		} else if (message.command === EditorFileMethodReferenceViewProtocolCommands.requestFirstFunction) {
			this.sendFirstFunctionName()
		}
	}

	hardRefresh() {
		if (this._view === undefined) {
			return
		}
		// Rebuild the HTML so the webview picks up the latest assets
		this._view.webview.html = this._getHtmlForWebview(
			this._view.webview,
			this._extensionUri
		)
		this.sendFileName()
		this.sendFirstFunctionName()
	}

	// When the active text editor changes, track it and push the new name
	textEditorChanged(event: TextEditorChangeEvent) {
		this.editor = event.editor
		this.sendFileName()
		this.sendFirstFunctionName()
	}

	// When visible editors change (e.g., last editor closed), update tracking and name
	onTextEditorsChangeVisibility(event: TextEditorsChangeVisibilityEvent) {
		if (event.editors.length === 0) {
			this.editor = undefined
		} else {
			this.editor = vscode.window.activeTextEditor
		}
		this.sendFileName()
		this.sendFirstFunctionName()
	}

	private sendFileName() {
		// If the webview isn't ready, there's nowhere to send the update
		if (this._view === undefined) {
			return
		}
		// Fall back to current VS Code active editor if our tracked editor is missing
		if (this.editor === undefined) {
			this.editor = vscode.window.activeTextEditor
		}
		// Use the active editor's file name , or empty string when none
		const fileName =
			this.editor?.document?.fileName !== undefined
				? path.basename(this.editor.document.fileName)
				: ''

		// Build the protocol message and post it to the webview
		const message: EditorFileMethodReferenceViewProtocol_ParentToChild = {
			command: EditorFileMethodReferenceViewProtocolCommands.updateFileName,
			fileName 
		}
		this._view.webview.postMessage(message)
	}

	private sendFirstFunctionName() {
		if (this._view === undefined) {
			return
		}
		const sourceFileMetaData = this.getSourceFileMetaData()
		let functionName = ''
		let main: FirstFunctionEntry | undefined
		const langInternal: FirstFunctionEntry[] = []
		const intern: FirstFunctionEntry[] = []
		const extern: FirstFunctionEntry[] = []

		if (sourceFileMetaData !== null) {
			const firstFn = this.getFirstFunctionMeta(sourceFileMetaData)

			if (firstFn !== undefined) {
				functionName = this.getDisplayName(firstFn.sourceNodeIndex.identifier)
				main = this.buildEntry(firstFn)

				for (const meta of this.toMetas(firstFn.lang_internal)) {
					const entry = this.buildEntry(meta)
					if (entry) {
						langInternal.push(entry)
					}
				}
				for (const meta of this.toMetas(firstFn.intern)) {
					const entry = this.buildEntry(meta)
					if (entry) {
						intern.push(entry)
					}
				}
				for (const meta of this.toMetas(firstFn.extern)) {
					const entry = this.buildEntry(meta)
					if (entry) {
						extern.push(entry)
					}
				}
			}
		}

		const message: EditorFileMethodReferenceViewProtocol_ParentToChild = {
			command: EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction,
			functionName,
			main,
			langInternal,
			intern,
			extern
		}
		this._view.webview.postMessage(message)
	}

	private buildEntry(meta: any): FirstFunctionEntry | undefined {
		// Prefer identifier, fall back to methodName or filePath for references
		const identifier = meta?.sourceNodeIndex?.identifier as
			| SourceNodeIdentifier_string
			| undefined
		
		const globalIdentifier =
			typeof meta?.sourceNodeIndex?.globalIdentifier === 'function'
				? meta.sourceNodeIndex.globalIdentifier()?.identifier
				: undefined
		const resolvedIndex =
			typeof meta?.getSourceNodeIndexByID === 'function' && meta?.id !== undefined
				? meta.getSourceNodeIndexByID(meta.id)
				: undefined
		const resolvedIdentifier =
			typeof resolvedIndex?.globalIdentifier === 'function'
				? resolvedIndex.globalIdentifier()?.identifier
				: resolvedIndex?.identifier
		const projectReport = this._container.textDocumentController.projectReport
		const globalIndexIdentifier =
			meta?.id !== undefined && projectReport?.globalIndex?.getSourceNodeIndexByID
				? projectReport.globalIndex.getSourceNodeIndexByID(meta.id)?.globalIdentifier?.()
						?.identifier ||
					projectReport.globalIndex.getSourceNodeIndexByID(meta.id)?.identifier
				: undefined
		const jsonName = typeof meta?.toJSON === 'function'
			? meta.toJSON()?.methodName || (meta.toJSON()?.filePath ? path.basename(meta.toJSON().filePath) : '')
			: undefined

		const name =
			(identifier && this.getDisplayName(identifier)) ||
			(globalIdentifier &&
				this.getDisplayName(globalIdentifier as SourceNodeIdentifier_string)) ||
			(resolvedIdentifier &&
				this.getDisplayName(resolvedIdentifier as SourceNodeIdentifier_string)) ||
			(globalIndexIdentifier &&
				this.getDisplayName(globalIndexIdentifier as SourceNodeIdentifier_string)) ||
			jsonName ||
			meta?.methodName 
		const cpuTime =
			meta.sensorValues?.aggregatedCPUTime ??
			meta.sensorValues?.selfCPUTime

		const cpuEnergy =
			meta.sensorValues?.aggregatedCPUEnergyConsumption ??
			meta.sensorValues?.selfCPUEnergyConsumption
		
			const ramEnergy =
			meta.sensorValues?.aggregatedRAMEnergyConsumption 
			//meta.sensorValues?.selfRAMEnergyConsumption

		return {
			name,
			cpuTime,
			cpuEnergy,
			ramEnergy
		}
	}

	private getDisplayName(identifier: SourceNodeIdentifier_string): string {
		const parts = SourceNodeIdentifierHelper.split(identifier)
		const lastPart = parts[parts.length - 1]
		const parsed = lastPart
			? SourceNodeIdentifierHelper.parseSourceNodeIdentifierPart(lastPart)
			: undefined
		return parsed?.name || ''
	}

	private toMetas(ref: any): any[] {
		if (ref?.values) {
			const result: any[] = []
			for (const item of ref.values() as Iterable<any>) {
				if (Array.isArray(item) && item.length === 2) {
					result.push(item[1])
				} else {
					result.push(item)
				}
			}
			return result
		}
		if (ref?.entries) {
			return Array.from(ref.entries() as Iterable<[any, any]>).map(
				([, meta]) => meta
			)
		}
		if (ref && typeof ref === 'object') {
			return Object.values(ref)
		}
		return []
	}

	private getFirstFunctionMeta(sourceFileMetaData: any): any | undefined {
		try {
			const projectReport = this._container.textDocumentController.projectReport
			if (!projectReport) {
				return sourceFileMetaData.functions.values().next().value
			}

			const relativeWorkspacePath = WorkspaceUtils.getRelativeWorkspacePath(
				this.editor?.document.fileName || ''
			)
			if (!relativeWorkspacePath) {
				return sourceFileMetaData.functions.values().next().value
			}

			const moduleIndex = projectReport.globalIndex.getModuleIndex('get')
			if (moduleIndex === undefined) {
				return sourceFileMetaData.functions.values().next().value
			}

			const pathIndex = moduleIndex.getFilePathIndex(
				'get',
				relativeWorkspacePath.toString() as UnifiedPath_string
			)
			if (pathIndex?.file === undefined) {
				return sourceFileMetaData.functions.values().next().value
			}
			if (pathIndex.id === undefined) {
				return sourceFileMetaData.functions.values().next().value
			}

			const firstIdentifier = sourceFileMetaData.functions.entries().next().value?.[1]
				?.sourceNodeIndex?.identifier as SourceNodeIdentifier_string | undefined

			console.log('First Identifier:', firstIdentifier)
			// {root}.{function:main}
			
			if (firstIdentifier === undefined) {
				return sourceFileMetaData.functions.values().next().value
			}

			const functionIndex = pathIndex.getSourceNodeIndex('get', firstIdentifier)
			
			if (functionIndex?.id === undefined) {
				return sourceFileMetaData.functions.values().next().value
			}

			

			const functionMeta = sourceFileMetaData.functions.get(functionIndex.id)
			console.log('Function Meta:', functionMeta)
			
			if (functionMeta === undefined) {
				return sourceFileMetaData.functions.values().next().value
			}
			return functionMeta
		} catch (e) {
			console.error('getFirstFunctionMeta failed', e)
			return sourceFileMetaData.functions.values().next().value
		}
	}

	
	
	
	
	// Closes the currently active editor tab
	private async closeActiveFile() {
		try {
			
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
		} catch (error) {
			console.error('Failed to close active editor file from reference view', error)
		}
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
			'EditorFileMethodReferenceView.js'
		])
		const stylesUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'EditorFileMethodReferenceView.css'
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
