import path from 'path'

import vscode from 'vscode'
import type {
	ProjectReport,
	SourceNodeIdentifier_string
} from '@oaklean/profiler-core'

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
	EditorFileMethodReferenceViewProtocol_ParentToChild,
	EditorFileMethodReferenceViewProtocol_UpdateFirstFunctionMessage,
	isEditorFileMethodReferenceViewProtocolChildToParent
} from '../../protocols/EditorFileMethodReferenceViewProtocol'
import WorkspaceUtils from '../../helper/WorkspaceUtils'
import {
	TextEditorChangeEvent,
	TextEditorsChangeVisibilityEvent,
	ScopeChangeEvent
} from '../../helper/EventHandler'
import { FunctionEntry } from '../../protocols/EditorFileMethodReferenceViewProtocol'
import { OpenSourceLocationCommandIdentifiers } from '../../types/commands/OpenSourceLocationCommand'
import { OpenSourceLocationProtocolCommands } from '../../protocols/OpenSourceLocationProtocol'
import OpenSourceLocationCommand from '../../commands/OpenSourceLocationCommand'
import {
	isReferenceMetaLike,
	isSourceFileMetaDataLike,
	ReferenceMetaLike,
	SourceFileMetaDataLike
} from '../../types/EditorFileMethodReferenceViewTypes'

const CALLER_EDGE_DIRECTION: CallerEdgeDirection = 'outgoing'

type UpdateFirstFunctionMessage =
	EditorFileMethodReferenceViewProtocol_UpdateFirstFunctionMessage

type OpenSourceLocationMessage = Extract<
	EditorFileMethodReferenceViewProtocol_ChildToParent,
	{ command: OpenSourceLocationProtocolCommands.openSourceLocation }
>

type BuiltFunctionSections = {
	functionName: string
	main?: FunctionEntry
	langInternal: FunctionEntry[]
	intern: FunctionEntry[]
	extern: FunctionEntry[]
	foreignReferences?: FunctionEntry[]
}

export class EditorFileMethodReferenceViewProvider
	implements vscode.WebviewViewProvider
{
	private subscriptions: vscode.Disposable[] = []

	public static readonly viewType = 'editorFileMethodReferenceView'

	private _view?: vscode.WebviewView
	_container: Container
	editor: vscode.TextEditor | undefined
	// Identifier of the currently selected scope from Method view events.
	private _currentScopeIdentifier: SourceNodeIdentifier_string | undefined

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
			this._container.eventHandler.onReportLoaded(
				this.refreshViewState.bind(this)
			),
			this._container.eventHandler.onTextEditorChange(
				this.textEditorChanged.bind(this)
			),
			this._container.eventHandler.onTextEditorsChangeVisibility(
				this.onTextEditorsChangeVisibility.bind(this)
			),
			this._container.eventHandler.onScopeChange(this.onScopeChange.bind(this))
		]
	}

	dispose() {
		// Explicitly release all listeners when the provider is disposed.
		for (const subscription of this.subscriptions) {
			subscription.dispose()
		}
		this.subscriptions = []
	}

	public resolveWebviewView(webviewView: vscode.WebviewView) {
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
		this.refreshViewState()
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
		const sourceFileMetaData =
			this._container.textDocumentController.getSourceFileMetaData(
				relativeWorkspacePath
			)
		if (!isSourceFileMetaDataLike(sourceFileMetaData)) {
			return null
		}
		return sourceFileMetaData
	}

	// Central message handler for webview -> extension communication.
	receiveMessageFromWebview(message: unknown) {
		if (!isEditorFileMethodReferenceViewProtocolChildToParent(message)) {
			return
		}
		switch (message.command) {
			case EditorFileMethodReferenceViewProtocolCommands.closeActiveFile:
				void this.closeActiveFile()
				break
			case EditorFileMethodReferenceViewProtocolCommands.requestFileName:
				this.sendFileName()
				break
			case EditorFileMethodReferenceViewProtocolCommands.requestFirstFunction:
				this.sendFirstFunctionName()
				break
			case OpenSourceLocationProtocolCommands.openSourceLocation:
				this.handleOpenSourceLocationMessage(message)
				break
			default:
				break
		}
	}

	private handleOpenSourceLocationMessage(message: OpenSourceLocationMessage) {
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
		this.refreshViewState()
	}

	// When the active editor changes, update both toolbar file and function block.
	textEditorChanged(event: TextEditorChangeEvent) {
		this.editor = event.editor
		this.refreshViewState()
	}

	// When visible editors change, refresh tracked editor and payload.
	onTextEditorsChangeVisibility(event: TextEditorsChangeVisibilityEvent) {
		if (event.editors.length === 0) {
			this.editor = undefined
		} else {
			this.editor = vscode.window.activeTextEditor
		}
		this.refreshViewState()
	}

	private refreshViewState() {
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
		if (
			event.relativeWorkspacePath.toString() !==
			relativeWorkspacePath.toString()
		) {
			return
		}
		console.debug('EditorFileMethodReferenceViewProvider: scope change', {
			file: relativeWorkspacePath.toString(),
			selectedIdentifier: event.selectedIdentifier,
			selectedIdentifierFirstParentWithMeasurements:
				event.selectedIdentifierFirstParentWithMeasurements
		})
		this._currentScopeIdentifier = toSourceNodeIdentifier(
			event.selectedIdentifierFirstParentWithMeasurements
		)
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
		this._view.webview.postMessage(this.buildFirstFunctionMessage())
	}

	private buildFirstFunctionMessage(): UpdateFirstFunctionMessage {
		const projectReport = this._container.textDocumentController.projectReport
		const sourceNodeGraph = this.resolveSourceNodeGraph(projectReport)
		const sourceFileMetaData = this.getSourceFileMetaData()
		const sections = this.createEmptyFunctionSections()

		if (sourceFileMetaData !== null) {
			const firstFn = this.resolveCurrentFunctionMeta(sourceFileMetaData)

			if (firstFn !== undefined) {
				sections.foreignReferences =
					this.buildForeignReferencesForCurrentFunction(
						sourceNodeGraph,
						firstFn,
						projectReport
					)
				sections.main = buildReferenceEntry(firstFn, projectReport)
				sections.functionName = this.resolveFunctionName(firstFn, sections.main)
				sections.langInternal = this.buildEntriesFromGroup(
					firstFn.lang_internal,
					projectReport,
					() => false
				)
				sections.intern = this.buildEntriesFromGroup(
					firstFn.intern,
					projectReport,
					(entry) =>
						entry.identifier !== undefined && entry.relativePath !== undefined
				)
				sections.extern = this.buildEntriesFromGroup(
					firstFn.extern,
					projectReport,
					(entry) =>
						entry.identifier !== undefined && entry.relativePath !== undefined
				)
			}
		}

		return {
			command:
				EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction,
			functionName: sections.functionName,
			main: sections.main,
			langInternal: sections.langInternal,
			intern: sections.intern,
			extern: sections.extern,
			foreignReferences: sections.foreignReferences
		}
	}

	private createEmptyFunctionSections(): BuiltFunctionSections {
		return {
			functionName: '',
			main: undefined,
			langInternal: [],
			intern: [],
			extern: [],
			foreignReferences: undefined
		}
	}

	private resolveSourceNodeGraph(
		projectReport: ProjectReport | undefined
	): SourceNodeGraphLike | undefined {
		const rawSourceNodeGraph = projectReport?.asSourceNodeGraph()
		return isSourceNodeGraphLike(rawSourceNodeGraph)
			? rawSourceNodeGraph
			: undefined
	}

	// Prefer scope-selected function; fall back to best-effort "first function" resolution.
	private resolveCurrentFunctionMeta(
		sourceFileMetaData: SourceFileMetaDataLike
	): ReferenceMetaLike | undefined {
		if (this._currentScopeIdentifier === undefined) {
			return this.getFirstFunctionMeta(sourceFileMetaData)
		}
		return (
			this.getFunctionMetaByIdentifier(
				sourceFileMetaData,
				this._currentScopeIdentifier
			) ?? this.getFirstFunctionMeta(sourceFileMetaData)
		)
	}

	private buildForeignReferencesForCurrentFunction(
		sourceNodeGraph: SourceNodeGraphLike | undefined,
		firstFn: ReferenceMetaLike,
		projectReport: ProjectReport | undefined
	): FunctionEntry[] {
		const currentScopeGraphNodeID = resolveCurrentFunctionGraphNodeID(
			sourceNodeGraph,
			firstFn,
			this._currentScopeIdentifier,
			this.editor?.document.fileName
		)
		const callerGraphNodeIDs = getCallerNodeIDsForCurrentNode(
			sourceNodeGraph,
			currentScopeGraphNodeID,
			CALLER_EDGE_DIRECTION
		)
		const foreignReferences = buildForeignReferences(
			sourceNodeGraph,
			currentScopeGraphNodeID,
			callerGraphNodeIDs,
			projectReport
		)
		console.debug('EditorFileMethodReferenceViewProvider: foreign references', {
			selectedIdentifier: firstFn.sourceNodeIndex?.identifier,
			currentNodeID: currentScopeGraphNodeID,
			callerNodeIDs: callerGraphNodeIDs.length,
			foreignReferences: foreignReferences.length
		})
		return foreignReferences
	}

	private resolveFunctionName(
		firstFn: ReferenceMetaLike,
		main: FunctionEntry | undefined
	): string {
		const firstIdentifier = firstFn.sourceNodeIndex?.identifier
		const nameFromIdentifier =
			firstIdentifier === undefined ? '' : getDisplayName(firstIdentifier)
		// Fallback for reports where identifier parsing fails but entry display name exists.
		if (
			nameFromIdentifier === '' &&
			main?.name !== undefined &&
			main.name.length > 0
		) {
			return main.name
		}
		return nameFromIdentifier
	}

	private buildEntriesFromGroup(
		group: unknown,
		projectReport: ProjectReport | undefined,
		resolveIsNavigable: (entry: FunctionEntry) => boolean
	): FunctionEntry[] {
		const entries: FunctionEntry[] = []
		for (const meta of toMetas(group)) {
			const entry = buildReferenceEntry(meta, projectReport)
			if (entry === undefined) {
				continue
			}
			entry.isNavigable = resolveIsNavigable(entry)
			entries.push(entry)
		}
		return entries
	}

	private getFunctionMetaByIdentifier(
		sourceFileMetaData: SourceFileMetaDataLike,
		identifier: SourceNodeIdentifier_string
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
	private getFirstFunctionMeta(
		sourceFileMetaData: SourceFileMetaDataLike
	): ReferenceMetaLike | undefined {
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

			const functionIndex = pathIndex.getSourceNodeIndex(
				getOperation,
				firstIdentifier
			)

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
