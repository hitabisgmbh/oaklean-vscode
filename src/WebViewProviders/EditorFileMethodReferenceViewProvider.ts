import path from 'path'

import vscode from 'vscode'
import { SourceNodeIdentifierHelper } from '@oaklean/profiler-core'
import {
	SourceNodeID_number,
	UnifiedPath_string,
	SourceNodeIdentifier_string} from '@oaklean/profiler-core/dist/src/types'

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
	TextEditorsChangeVisibilityEvent,
	ScopeChangeEvent
} from '../helper/EventHandler'
import { FirstFunctionEntry } from '../protocols/EditorFileMethodReferenceViewProtocol'
import { OpenSourceLocationCommandIdentifiers } from '../types/commands/OpenSourceLocationCommand'
import { OpenSourceLocationProtocolCommands } from '../protocols/OpenSourceLocationProtocol'
import OpenSourceLocationCommand from '../commands/OpenSourceLocationCommand'

// Minimal sensor subset used to render measurement values in the reference list.
type SensorValuesLike = {
	aggregatedCPUTime?: number
	selfCPUTime?: number
	aggregatedCPUEnergyConsumption?: number
	selfCPUEnergyConsumption?: number
	aggregatedRAMEnergyConsumption?: number
}

// Minimal source-node index subset required for display + navigation fallback resolution.
type SourceNodeIndexLike = {
	identifier?: SourceNodeIdentifier_string
	globalIdentifier?: () => { identifier?: SourceNodeIdentifier_string } | undefined
	pathIndex?: { identifier?: string }
	presentInOriginalSourceCode?: boolean
}

// JSON projection we read from profiler metadata objects.
type JsonMetaLike = {
	methodName?: string
	filePath?: string
}

// Runtime shape of one reference entry from profiler metadata.
type ReferenceMetaLike = {
	id?: SourceNodeID_number
	methodName?: string
	sourceNodeIndex?: SourceNodeIndexLike
	sensorValues?: SensorValuesLike
	lang_internal?: unknown
	intern?: unknown
	extern?: unknown
	getSourceNodeIndexByID?: (id: SourceNodeID_number) => SourceNodeIndexLike | undefined
	toJSON?: () => JsonMetaLike | undefined
}

// Runtime API shape for the function collection in SourceFileMetaData.
type SourceFileFunctionsLike = {
	values: () => IterableIterator<ReferenceMetaLike>
	entries: () => Iterator<[unknown, ReferenceMetaLike]>
	get: (id: SourceNodeID_number) => ReferenceMetaLike | undefined
}

// Minimal SourceFileMetaData shape needed by this provider.
type SourceFileMetaDataLike = {
	functions: SourceFileFunctionsLike
}

// Generic runtime object guard used by all custom validators below.
function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object'
}

// Lightweight guard: we only need object semantics for reference entries.
function isReferenceMetaLike(value: unknown): value is ReferenceMetaLike {
	return isRecord(value)
}

// Ensures SourceFileMetaData has the functions API this provider depends on.
function isSourceFileMetaDataLike(value: unknown): value is SourceFileMetaDataLike {
	if (!isRecord(value)) {
		return false
	}
	const functions = value.functions
	if (!isRecord(functions)) {
		return false
	}
	return (
		typeof functions.values === 'function' &&
		typeof functions.entries === 'function' &&
		typeof functions.get === 'function'
	)
}

export class EditorFileMethodReferenceViewProvider
	implements vscode.WebviewViewProvider {
	private subscriptions: vscode.Disposable[] = []

	public static readonly viewType = 'editorFileMethodReferenceView'

	private _view?: vscode.WebviewView
	_container: Container
	editor: vscode.TextEditor | undefined
	private _currentScopeIdentifier: string | undefined

	constructor(
		private readonly _extensionUri: vscode.Uri,
		container: Container
	) {
		this._container = container
		// Keep the view synchronized with editor/report/runtime changes.
		this.subscriptions = [
			this._container.eventHandler.onWebpackRecompile(
				this.hardRefresh.bind(this)
			),
			this._container.eventHandler.onTextEditorChange(
				this.textEditorChanged.bind(this)
			),
			this._container.eventHandler.onTextEditorsChangeVisibility(
				this.onTextEditorsChangeVisibility.bind(this)
			),
			this._container.eventHandler.onScopeChange(
				this.onScopeChange.bind(this)
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
		this.editor = vscode.window.activeTextEditor
		// Prime initial payload so the webview can render immediately.
		this.sendFileName()
		this.sendFirstFunctionName()
	}

	// Resolve metadata for the currently active editor file.
	getSourceFileMetaData(): SourceFileMetaDataLike | null {
		if (this.editor === undefined) {
			return null
		}
		const relativeWorkspacePath = WorkspaceUtils.getRelativeWorkspacePath(
			this.editor.document.fileName
		)
		if (relativeWorkspacePath === undefined) {
			return null
		}
		const sourceFileMetaData = this._container.textDocumentController.getSourceFileMetaData(
			relativeWorkspacePath
		)
		if (!isSourceFileMetaDataLike(sourceFileMetaData)) {
			return null
		}
		return sourceFileMetaData
	}

	// Central message handler for webview -> extension communication.
	receiveMessageFromWebview(
		message: EditorFileMethodReferenceViewProtocol_ChildToParent
	) {
		if (
			message.command ===
			EditorFileMethodReferenceViewProtocolCommands.closeActiveFile
		) {
			void this.closeActiveFile()
		} else if (
			message.command ===
			EditorFileMethodReferenceViewProtocolCommands.requestFileName
		) {
			this.sendFileName()
		} else if (
			message.command ===
			EditorFileMethodReferenceViewProtocolCommands.requestFirstFunction
		) {
			this.sendFirstFunctionName()
		} else if (
			message.command === OpenSourceLocationProtocolCommands.openSourceLocation
		) {
			// Navigation message from the webview: open file + jump to identifier.
			const identifier = message.identifier
			const relativePath = message.relativePath

			// Resolve workspace config to translate relative path to workspace path.
			const config = this._container.textDocumentController.config
			if (config === undefined) {
				return
			}
			const relativeWorkspacePath =
				WorkspaceUtils.getRelativeWorkspacePathFromRelativePath(
					config,
					relativePath
				)
			if (relativeWorkspacePath === undefined) {
				return
			}
			OpenSourceLocationCommand.execute({
				command: OpenSourceLocationCommandIdentifiers.openSourceLocation,
				args: {
					relativeWorkspacePath: relativeWorkspacePath.toString(),
					sourceNodeIdentifier: identifier as SourceNodeIdentifier_string
				}
			})
		}
	}

	// Re-render HTML assets and re-send current state.
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

	// When the active editor changes, update both toolbar file and function block.
	textEditorChanged(event: TextEditorChangeEvent) {
		this.editor = event.editor
		this.sendFileName()
		this.sendFirstFunctionName()
	}

	// When visible editors change, refresh tracked editor and payload.
	onTextEditorsChangeVisibility(event: TextEditorsChangeVisibilityEvent) {
		if (event.editors.length === 0) {
			this.editor = undefined
		} else {
			this.editor = vscode.window.activeTextEditor
		}
		this.sendFileName()
		this.sendFirstFunctionName()
	}

	private onScopeChange(event: ScopeChangeEvent) {
		if (this.editor === undefined) {
			return
		}
		const relativeWorkspacePath = WorkspaceUtils.getRelativeWorkspacePath(
			this.editor.document.fileName
		)
		if (relativeWorkspacePath === undefined) {
			return
		}
		if (event.relativeWorkspacePath.toString() !== relativeWorkspacePath.toString()) {
			return
		}
		console.debug('EditorFileMethodReferenceViewProvider: scope change', {
			file: relativeWorkspacePath.toString(),
			selectedIdentifier: event.selectedIdentifier,
			selectedIdentifierFirstParentWithMeasurements:
				event.selectedIdentifierFirstParentWithMeasurements
		})
		this._currentScopeIdentifier = event.selectedIdentifierFirstParentWithMeasurements
		this.sendFirstFunctionName()
	}

	// Sends current editor file name to the webview toolbar.
	private sendFileName() {
		// If the webview isn't ready, there's nowhere to send the update.
		if (this._view === undefined) {
			return
		}
		// Fallback: recover editor if internal tracking is temporarily empty.
		if (this.editor === undefined) {
			this.editor = vscode.window.activeTextEditor
		}
		// Send only basename for compact toolbar display.
		const fileName =
			this.editor?.document?.fileName !== undefined
				? path.basename(this.editor.document.fileName)
				: ''

		// Build protocol message and post to webview.
		const message: EditorFileMethodReferenceViewProtocol_ParentToChild = {
			command: EditorFileMethodReferenceViewProtocolCommands.updateFileName,
			fileName
		}
		this._view.webview.postMessage(message)
	}

	// Builds the "first function + grouped references" payload for the webview.
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
			const firstFn = this._currentScopeIdentifier === undefined
				? this.getFirstFunctionMeta(sourceFileMetaData)
				: this.getFunctionMetaByIdentifier(
						sourceFileMetaData,
						this._currentScopeIdentifier
					) ?? this.getFirstFunctionMeta(sourceFileMetaData)

			if (firstFn !== undefined) {
				const firstIdentifier = firstFn.sourceNodeIndex?.identifier
				if (firstIdentifier !== undefined) {
					functionName = this.getDisplayName(firstIdentifier)
				}
				// "main" represents the selected first function itself.
				main = this.buildEntry(firstFn)

				for (const meta of this.toMetas(firstFn.lang_internal)) {
					const entry = this.buildEntry(meta)
					if (entry) {
						// Explicit requirement: lang_internal must not navigate.
						entry.isNavigable = false
						langInternal.push(entry)
					}
				}
				for (const meta of this.toMetas(firstFn.intern)) {
					const entry = this.buildEntry(meta)
					if (entry) {
						// Intern rows are clickable only when navigation data is complete.
						entry.isNavigable =
							entry.identifier !== undefined &&
							entry.relativePath !== undefined
						intern.push(entry)
					}
				}
				for (const meta of this.toMetas(firstFn.extern)) {
					const entry = this.buildEntry(meta)
					if (entry) {
						// Extern rows follow the same navigation contract as intern rows.
						entry.isNavigable =
							entry.identifier !== undefined &&
							entry.relativePath !== undefined
						extern.push(entry)
					}
				}
			}
		}

		const message: EditorFileMethodReferenceViewProtocol_ParentToChild = {
			command:
				EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction,
			functionName,
			main,
			langInternal,
			intern,
			extern
		}
		this._view.webview.postMessage(message)
	}

	private getFunctionMetaByIdentifier(
		sourceFileMetaData: SourceFileMetaDataLike,
		identifier: string
	): ReferenceMetaLike | undefined {
		for (const meta of sourceFileMetaData.functions.values()) {
			if (!isReferenceMetaLike(meta)) {
				continue
			}
			if (meta.sourceNodeIndex?.identifier === identifier) {
				return meta
			}
		}
		return undefined
	}

	// Normalizes one metadata entry into the webview's FirstFunctionEntry payload.
	private buildEntry(meta: ReferenceMetaLike): FirstFunctionEntry | undefined {
		// Primary identifier source.
		const identifier = meta?.sourceNodeIndex?.identifier as
			| SourceNodeIdentifier_string
			| undefined

		// Fallback 1: global identifier from local source-node index.
		const globalIdentifier =
			typeof meta?.sourceNodeIndex?.globalIdentifier === 'function'
				? meta.sourceNodeIndex.globalIdentifier()?.identifier
				: undefined

		// Fallback 2: resolve index by id in current meta scope.
		const resolvedIndex =
			typeof meta?.getSourceNodeIndexByID === 'function' &&
			meta?.id !== undefined
				? meta.getSourceNodeIndexByID(meta.id)
				: undefined

		const resolvedIdentifier =
			typeof resolvedIndex?.globalIdentifier === 'function'
				? resolvedIndex.globalIdentifier()?.identifier
				: resolvedIndex?.identifier

		// Fallback 3: resolve via project global index.
		const projectReport = this._container.textDocumentController.projectReport
		const globalIndexEntry =
			meta?.id !== undefined &&
			projectReport?.globalIndex?.getSourceNodeIndexByID
				? projectReport.globalIndex.getSourceNodeIndexByID(meta.id)
				: undefined
		const globalIndexIdentifier =
			globalIndexEntry !== undefined
				? globalIndexEntry.globalIdentifier?.()?.identifier ||
					globalIndexEntry.identifier
				: undefined

		// Optional JSON projection used for display/path fallbacks.
		const json = typeof meta?.toJSON === 'function'
			? meta.toJSON()
			: undefined
		const jsonName =
			json?.methodName ||
			(json?.filePath ? path.basename(json.filePath) : '')

		// Final identifier used for navigation and preferred display label.
		const finalIdentifier =
			identifier ||
			(globalIdentifier as SourceNodeIdentifier_string | undefined) ||
			(resolvedIdentifier as SourceNodeIdentifier_string | undefined) ||
			(globalIndexIdentifier as SourceNodeIdentifier_string | undefined)

		// Human-readable method name with robust fallback chain.
		const name =
			(finalIdentifier && this.getDisplayName(finalIdentifier)) ||
			(globalIdentifier &&
				this.getDisplayName(globalIdentifier as SourceNodeIdentifier_string)) ||
			(resolvedIdentifier &&
				this.getDisplayName(
					resolvedIdentifier as SourceNodeIdentifier_string
				)) ||
			(globalIndexIdentifier &&
				this.getDisplayName(
					globalIndexIdentifier as SourceNodeIdentifier_string
				)) ||
			jsonName ||
			meta?.methodName ||
			''

		// CPU and energy values; prefer aggregated values where available.
		const cpuTime =
			meta.sensorValues?.aggregatedCPUTime ?? meta.sensorValues?.selfCPUTime

		const cpuEnergy =
			meta.sensorValues?.aggregatedCPUEnergyConsumption ??
			meta.sensorValues?.selfCPUEnergyConsumption

		const ramEnergy = meta.sensorValues?.aggregatedRAMEnergyConsumption

		// Path source 1: json filePath converted to workspace-relative format.
		const filePath =
			typeof json?.filePath === 'string' ? json.filePath : undefined
		const relativePathFromMeta =
			filePath === undefined
				? undefined
				: WorkspaceUtils.getRelativeWorkspacePath(filePath)?.toString()

		// Path source 2/3: direct index path identifiers from resolved indexes.
		const relativePathFromIndex =
			meta?.sourceNodeIndex?.pathIndex?.identifier ||
			resolvedIndex?.pathIndex?.identifier ||
			globalIndexEntry?.pathIndex?.identifier

			// Final path used for navigation payload.
			const relativePath = relativePathFromMeta || relativePathFromIndex
			const presentInOriginalSourceCode =
				meta?.sourceNodeIndex?.presentInOriginalSourceCode ??
				resolvedIndex?.presentInOriginalSourceCode ??
				globalIndexEntry?.presentInOriginalSourceCode

			return {
				name,
				cpuTime,
				cpuEnergy,
				ramEnergy,
				identifier: finalIdentifier,
				relativePath,
				notPresentInOriginalSourceCode: presentInOriginalSourceCode === false
			}
		}

	// Extracts readable method name from a full source-node identifier.
	private getDisplayName(identifier: SourceNodeIdentifier_string): string {
		const parts = SourceNodeIdentifierHelper.split(identifier)
		const lastPart = parts[parts.length - 1]
		const parsed = lastPart
			? SourceNodeIdentifierHelper.parseSourceNodeIdentifierPart(lastPart)
			: undefined
		return parsed?.name || ''
	}

	// Normalizes different reference container shapes into a flat meta list.
	private toMetas(ref: unknown): ReferenceMetaLike[] {
		// Shape 1: values() iterator, potentially yielding [key, value] tuples.
		if (isRecord(ref) && typeof ref.values === 'function') {
			const result: ReferenceMetaLike[] = []
			for (const item of ref.values() as Iterable<unknown>) {
				if (Array.isArray(item) && item.length === 2) {
					if (isReferenceMetaLike(item[1])) {
						result.push(item[1])
					}
				} else if (isReferenceMetaLike(item)) {
					result.push(item)
				}
			}
			return result
		}

		// Shape 2: entries() iterator yielding [key, value].
		if (isRecord(ref) && typeof ref.entries === 'function') {
			const result: ReferenceMetaLike[] = []
			for (const entry of ref.entries() as Iterable<[unknown, unknown]>) {
				if (Array.isArray(entry) && entry.length === 2 && isReferenceMetaLike(entry[1])) {
					result.push(entry[1])
				}
			}
			return result
		}

		// Shape 3: plain object map.
		if (ref && typeof ref === 'object') {
			const result: ReferenceMetaLike[] = []
			for (const value of Object.values(ref)) {
				if (isReferenceMetaLike(value)) {
					result.push(value)
				}
			}
			return result
		}
		return []
	}

	// Resolves the "first function" for the current file using report indexes when possible.
	private getFirstFunctionMeta(sourceFileMetaData: SourceFileMetaDataLike): ReferenceMetaLike | undefined {
		try {
			const projectReport = this._container.textDocumentController.projectReport
			if (projectReport === undefined) {
				return sourceFileMetaData.functions.values().next().value
			}

			const relativeWorkspacePath = WorkspaceUtils.getRelativeWorkspacePath(
				this.editor?.document.fileName || ''
			)
			if (relativeWorkspacePath === undefined) {
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

			// Use first local function identifier as lookup key in the file's path index.
			const firstIdentifier = sourceFileMetaData.functions.entries().next()
				.value?.[1]?.sourceNodeIndex?.identifier as
				| SourceNodeIdentifier_string
				| undefined

			if (firstIdentifier === undefined) {
				return sourceFileMetaData.functions.values().next().value
			}

			const functionIndex = pathIndex.getSourceNodeIndex('get', firstIdentifier)

			if (functionIndex?.id === undefined) {
				return sourceFileMetaData.functions.values().next().value
			}

			const functionMeta = sourceFileMetaData.functions.get(functionIndex.id)

			if (functionMeta === undefined) {
				return sourceFileMetaData.functions.values().next().value
			}
			return functionMeta
		} catch (e) {
			console.error('getFirstFunctionMeta failed', e)
			return sourceFileMetaData.functions.values().next().value
		}
	}

	// Closes the currently active editor tab.
	private async closeActiveFile() {
		try {
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
		} catch (error) {
			console.error(
				'Failed to close active editor file from reference view',
				error
			)
		}
	}

	private _getHtmlForWebview(
		webview: vscode.Webview,
		extensionUri: vscode.Uri
	) {
		// Build secure webview HTML with strict CSP and explicit asset URIs.
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
