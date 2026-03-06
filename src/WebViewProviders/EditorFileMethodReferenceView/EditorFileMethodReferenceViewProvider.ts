import path from 'path'

import vscode from 'vscode'
import {
	SourceNodeID_number,
	SourceNodeIdentifier_string} from '@oaklean/profiler-core/dist/src/types'

import {
	buildForeignReferences,
	CallerEdgeDirection,
	getCallerNodeIDsForCurrentNode,
	isSourceNodeGraphLike,
	resolveCurrentFunctionGraphNodeID,
	SourceNodeGraphLike
} from './EditorFileMethodReferenceGraph'
import {
	buildReferenceEntry,
	getDisplayName,
	toMetas,
	toSourceNodeIdentifier,
	toUnifiedPathString
} from './EditorFileMethodReferenceMapper'
import { getEditorFileMethodReferenceViewHtml } from './EditorFileMethodReferenceViewHtml'

import { Container } from '../../container'
import {
	EditorFileMethodReferenceViewProtocolCommands,
	EditorFileMethodReferenceViewProtocol_ChildToParent,
	EditorFileMethodReferenceViewProtocol_ParentToChild
} from '../../protocols/EditorFileMethodReferenceViewProtocol'
import WorkspaceUtils from '../../helper/WorkspaceUtils'
import {
	TextEditorChangeEvent,
	TextEditorsChangeVisibilityEvent,
	ScopeChangeEvent
} from '../../helper/EventHandler'
import { FirstFunctionEntry } from '../../protocols/EditorFileMethodReferenceViewProtocol'
import { OpenSourceLocationCommandIdentifiers } from '../../types/commands/OpenSourceLocationCommand'
import { OpenSourceLocationProtocolCommands } from '../../protocols/OpenSourceLocationProtocol'
import OpenSourceLocationCommand from '../../commands/OpenSourceLocationCommand'

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

const CALLER_EDGE_DIRECTION: CallerEdgeDirection = 'outgoing'

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
	// Identifier of the currently selected scope from Method view events.
	private _currentScopeIdentifier: string | undefined
	// Resolved graph node id for the selected/current function.
	private _currentScopeGraphNodeID: string | undefined
	// Caller node ids resolved from the graph for foreign-reference rendering.
	private _currentScopeCallerGraphNodeIDs: string[] = []

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
		// Explicitly release all listeners when the provider is disposed.
		for (const subscription of this.subscriptions) {
			subscription.dispose()
		}
		this.subscriptions = []
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView
	) {
		// Store webview handle once VS Code resolves the view instance.
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

		webviewView.webview.html = getEditorFileMethodReferenceViewHtml(
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
		// User clicked "Close" in the toolbar.
		if (
			message.command ===
			EditorFileMethodReferenceViewProtocolCommands.closeActiveFile
		) {
			void this.closeActiveFile()
		// Webview requests latest file name after mount/reload.
		} else if (
			message.command ===
			EditorFileMethodReferenceViewProtocolCommands.requestFileName
		) {
			this.sendFileName()
		// Webview requests latest function/reference payload after mount/reload.
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
			const sourceNodeIdentifier = toSourceNodeIdentifier(identifier)
			if (sourceNodeIdentifier === undefined) {
				return
			}
			OpenSourceLocationCommand.execute({
				command: OpenSourceLocationCommandIdentifiers.openSourceLocation,
				args: {
					relativeWorkspacePath: relativeWorkspacePath.toString(),
					sourceNodeIdentifier
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
			this._view.webview.html = getEditorFileMethodReferenceViewHtml(
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
		// Ignore scope events when no active editor is tracked.
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
		// Graph data is optional (e.g., report not loaded); all graph operations below are guarded.
		const projectReport = this._container.textDocumentController.projectReport
		const rawSourceNodeGraph = projectReport?.asSourceNodeGraph()
		const sourceNodeGraph: SourceNodeGraphLike | undefined = isSourceNodeGraphLike(rawSourceNodeGraph)
			? rawSourceNodeGraph
			: undefined

		const sourceFileMetaData = this.getSourceFileMetaData()
		let functionName = ''
		let main: FirstFunctionEntry | undefined
		const langInternal: FirstFunctionEntry[] = []
		const intern: FirstFunctionEntry[] = []
		const extern: FirstFunctionEntry[] = []
		let foreignReferences: FirstFunctionEntry[] | undefined

		if (sourceFileMetaData !== null) {
			// Prefer scope-selected function; fall back to best-effort "first function" resolution.
			const firstFn = this._currentScopeIdentifier === undefined
				? this.getFirstFunctionMeta(sourceFileMetaData)
				: this.getFunctionMetaByIdentifier(
						sourceFileMetaData,
						this._currentScopeIdentifier
					) ?? this.getFirstFunctionMeta(sourceFileMetaData)

			if (firstFn !== undefined) {
				// Resolve graph context for "functions that use this function" section.
				this._currentScopeGraphNodeID = resolveCurrentFunctionGraphNodeID(
					sourceNodeGraph,
					firstFn,
					this._currentScopeIdentifier,
					this.editor?.document.fileName
				)
				this._currentScopeCallerGraphNodeIDs = getCallerNodeIDsForCurrentNode(
					sourceNodeGraph,
					this._currentScopeGraphNodeID,
					CALLER_EDGE_DIRECTION
				)
				foreignReferences = buildForeignReferences(
					sourceNodeGraph,
					this._currentScopeGraphNodeID,
					this._currentScopeCallerGraphNodeIDs,
					projectReport
				)
				console.debug(
					'EditorFileMethodReferenceViewProvider: foreign references',
					{
						selectedIdentifier: firstFn.sourceNodeIndex?.identifier,
						currentNodeID: this._currentScopeGraphNodeID,
						callerNodeIDs: this._currentScopeCallerGraphNodeIDs.length,
						foreignReferences: foreignReferences.length
					}
				)

				const firstIdentifier = firstFn.sourceNodeIndex?.identifier
				if (firstIdentifier !== undefined) {
					functionName = getDisplayName(firstIdentifier)
				}
				// "main" represents the selected first function itself.
				main = buildReferenceEntry(firstFn, projectReport)

				// Convert each group from report metadata to webview protocol entries.
				for (const meta of toMetas(firstFn.lang_internal)) {
					const entry = buildReferenceEntry(meta, projectReport)
					if (entry) {
						// Explicit requirement: lang_internal must not navigate.
						entry.isNavigable = false
						langInternal.push(entry)
					}
				}
				for (const meta of toMetas(firstFn.intern)) {
					const entry = buildReferenceEntry(meta, projectReport)
					if (entry) {
						// Intern rows are clickable only when navigation data is complete.
						entry.isNavigable =
							entry.identifier !== undefined &&
							entry.relativePath !== undefined
						intern.push(entry)
					}
				}
				for (const meta of toMetas(firstFn.extern)) {
					const entry = buildReferenceEntry(meta, projectReport)
					if (entry) {
						// Extern rows follow the same navigation contract as intern rows.
						entry.isNavigable =
							entry.identifier !== undefined &&
							entry.relativePath !== undefined
						extern.push(entry)
					}
				}
			}
		} else {
			// No metadata for current file: clear cached graph state to avoid stale foreign references.
			this._currentScopeGraphNodeID = undefined
			this._currentScopeCallerGraphNodeIDs = []
		}

		const message: EditorFileMethodReferenceViewProtocol_ParentToChild = {
			command:
				EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction,
			functionName,
			main,
			langInternal,
			intern,
			extern,
			foreignReferences
		}
		this._view.webview.postMessage(message)
	}

	private getFunctionMetaByIdentifier(
		sourceFileMetaData: SourceFileMetaDataLike,
		identifier: string
	): ReferenceMetaLike | undefined {
		// The metadata map is keyed by node id; identifier lookup requires a scan by sourceNodeIndex.
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

	// Resolves the "first function" for the current file using report indexes when possible.
	private getFirstFunctionMeta(sourceFileMetaData: SourceFileMetaDataLike): ReferenceMetaLike | undefined {
		// Stable fallback if report/global-index resolution cannot be completed.
		const fallbackMeta = sourceFileMetaData.functions.values().next().value
		// Profiler index API uses string operation dispatch ("get" / "set"/...).
		const getOperation = 'get'
		try {
			const projectReport = this._container.textDocumentController.projectReport
			if (projectReport === undefined) {
				return fallbackMeta
			}

			const relativeWorkspacePath = WorkspaceUtils.getRelativeWorkspacePath(
				this.editor?.document.fileName ?? ''
			)
			if (relativeWorkspacePath === undefined) {
				return fallbackMeta
			}

			const moduleIndex = projectReport.globalIndex.getModuleIndex(getOperation)
			if (moduleIndex === undefined) {
				return fallbackMeta
			}

			const unifiedRelativeWorkspacePath = toUnifiedPathString(
				relativeWorkspacePath.toString()
			)
			if (unifiedRelativeWorkspacePath === undefined) {
				return fallbackMeta
			}
			const pathIndex = moduleIndex.getFilePathIndex(
				getOperation,
				unifiedRelativeWorkspacePath
			)
			if (pathIndex?.file === undefined) {
				return fallbackMeta
			}
			if (pathIndex.id === undefined) {
				return fallbackMeta
			}

			// Use first local function identifier as lookup key in the file's path index.
			const firstIdentifier = sourceFileMetaData.functions.entries().next()
				.value?.[1]?.sourceNodeIndex?.identifier

			if (firstIdentifier === undefined) {
				return fallbackMeta
			}

			const functionIndex = pathIndex.getSourceNodeIndex(getOperation, firstIdentifier)

			if (functionIndex?.id === undefined) {
				return fallbackMeta
			}

			const functionMeta = sourceFileMetaData.functions.get(functionIndex.id)

			if (functionMeta === undefined) {
				return fallbackMeta
			}
			return functionMeta
		} catch (e) {
			// Defensive catch: third-party report/index structures may throw on malformed state.
			console.error('getFirstFunctionMeta failed', e)
			return fallbackMeta
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

}
