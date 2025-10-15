import * as fs from 'fs'

import vscode,
{
	Disposable,
	TextEditor,
	TextDocument,
	EventEmitter,
	Event,
	window,
	TextDocumentChangeEvent,
} from 'vscode'
import { TimeHelper, UnifiedPath } from '@oaklean/profiler-core'

import { Container } from '../container'
import { StorageChangeEvent } from '../storage'
import { Profile } from '../types/profile'
import { SortDirection } from '../types/sortDirection'
import { FilterPaths } from '../types/FilterPaths'
import { SensorValueRepresentation } from '../types/sensorValueRepresentation'
import { WEBPACK_WEBVIEW_PATH } from '../constants/webpack'

export type ReportLoadedEvent = {
	type: 'ProjectReport'
}

export type SelectedSensorValueRepresentationChangeEvent = {
	readonly sensorValueRepresentation: SensorValueRepresentation
}

export type ToggleLineAnnotationsChangeEvent = {
	readonly enabled: boolean
}

export type ReportPathChangeEvent = {
	readonly reportPath: UnifiedPath
}

export type TextEditorChangeEvent = {
	readonly editor: TextEditor
}

export type TextEditorsChangeVisibilityEvent = {
	readonly editors: readonly TextEditor[]
}

export type TextDocumentOpenEvent = {
	readonly document: TextDocument
}

export type TextDocumentCloseEvent = {
	readonly document: TextDocument
}

export type SortDirectionChangeEvent = {
	readonly sortDirection: SortDirection
}

export type SourceFileInformationChangeEvent = {
	readonly absolutePath: UnifiedPath
}

export type FilterPathChangeEvent = {
	readonly filterPaths: FilterPaths
}

export type ProfileChangeEvent = {
	readonly profile: Profile
}

export type WebpackRecompileEvent = {
	data?: undefined
}

export default class EventHandler implements Disposable {
	private readonly _disposable: Disposable
	container: Container

	private _reportPathChange = new EventEmitter<ReportPathChangeEvent>()
	private _selectedSensorValueRepresentationChangeEvent =
		new EventEmitter<SelectedSensorValueRepresentationChangeEvent>()
	private _toggleLineAnnotationsChangeEvent = new EventEmitter<ToggleLineAnnotationsChangeEvent>()
	private _reportLoaded = new EventEmitter<ReportLoadedEvent>()

	private _textEditorsChangeVisibility = new EventEmitter<TextEditorsChangeVisibilityEvent>()
	private _textEditorChange = new EventEmitter<TextEditorChangeEvent>()
	private _textDocumentOpen = new EventEmitter<TextDocumentOpenEvent>()
	private _textDocumentClose = new EventEmitter<TextDocumentCloseEvent>()
	private _textDocumentChange = new EventEmitter<TextDocumentChangeEvent>()
	private _textDocumentDidSave = new EventEmitter<vscode.TextDocument>()
	private _sourceFileInformationChanged = new EventEmitter<SourceFileInformationChangeEvent>()
	private _filterPathChange = new EventEmitter<FilterPathChangeEvent>()
	private _sortDirectionChange = new EventEmitter<SortDirectionChangeEvent>()
	private _profileChange = new EventEmitter<ProfileChangeEvent>()

	private _webpackRecompile = new EventEmitter<WebpackRecompileEvent>()

	constructor(container: Container) {
		this.container = container
		this._disposable = Disposable.from(
			this.container.storage.onDidChange(this.storeChanged.bind(this)),
			vscode.workspace.onDidOpenTextDocument(this.fireTextDocumentOpen.bind(this)),
			vscode.workspace.onDidCloseTextDocument(this.fireTextDocumentClose.bind(this)),
			vscode.workspace.onDidSaveTextDocument(this.fireTextDocumentDidSave.bind(this)),
			vscode.workspace.onDidChangeTextDocument(this.fireTextDocumentChange.bind(this)),
			vscode.window.onDidChangeVisibleTextEditors(this.fireTextEditorsChangeVisibility.bind(this)),
			window.onDidChangeActiveTextEditor(this.fireTextEditorChange.bind(this)),
			this.onWebpackRecompileWatcher()
		)
	}


	/*
	 * Watches the webpack webview directory for changes and fires a recompile event
	 * when a change is detected.
	 * This is only active in development mode.
	 */
	onWebpackRecompileWatcher(): { dispose: () => void } {
		if (
			this.container.context.extensionMode !== vscode.ExtensionMode.Development
		) {
			return { dispose: () => undefined }
		}

		let debounceTimer: NodeJS.Timeout | null = null
		const watcher = fs.watch(
			`${this.container.context.extensionUri.fsPath}/${WEBPACK_WEBVIEW_PATH}`,
			{ recursive: true },
			async (eventType, filename) => {
				// only refresh when there are no changes for 1 second
				if (debounceTimer) {
					clearTimeout(debounceTimer)
				}

				debounceTimer = setTimeout(() => {
					this.fireWebpackRecompile()
				}, 1000)
			}
		)

		return {
			dispose: () => {
				if (debounceTimer) {
					clearTimeout(debounceTimer)
				}
				watcher.close()
			}
		}
	}

	fireInitialEvents() {
		const reportPath: UnifiedPath = this.container.storage.getWorkspace('reportPath') as UnifiedPath
		if (reportPath && fs.existsSync(reportPath.toString())) {
			this.fireReportPathChange(reportPath)
		} else {
			this.container.selectReportCommand.execute()
		}

		for (const document of vscode.workspace.textDocuments) {
			this.fireTextDocumentOpen(document)
		}
		if (window.activeTextEditor) {
			this.fireTextEditorChange(window.activeTextEditor)
		}
	}

	dispose() {
		this._disposable.dispose()
	}

	storeChanged(event: StorageChangeEvent) {
		const { key, workspace } = event
		if (!workspace) {
			return
		}
		switch (key) {
			case 'reportPath': {
				const reportPath = this.container.storage.getWorkspace('reportPath') as UnifiedPath
				if (reportPath) {
					this.fireReportPathChange(reportPath)
				}
			}
				break
			case 'sensorValueRepresentation': {
				const sensorValueRepresentation = this.container.storage.getWorkspace('sensorValueRepresentation') as SensorValueRepresentation
				if (sensorValueRepresentation.selectedSensorValueType
					&& sensorValueRepresentation.selectedValueRepresentation) {
					this.fireSelectedSensorValueTypeChange(sensorValueRepresentation)
				}
			}
				break
			case 'enableLineAnnotations': {
				const enableLineAnnotations = this.container.storage.getWorkspace('enableLineAnnotations') as boolean
				this.fireToggleLineAnnotationsChange(enableLineAnnotations)
			}
				break
			case 'includedFilterPath':
			case 'excludedFilterPath': {
				const includedFilterPath = this.container.storage.getWorkspace('includedFilterPath') as string
				const excludedFilterPath = this.container.storage.getWorkspace('excludedFilterPath') as string
				this.fireFilterPathChange({ includedFilterPath, excludedFilterPath })
			}
				break
			case 'sortDirection': {
				const sortDirection = this.container.storage.getWorkspace('sortDirection') as SortDirection
				this.fireSortDirectionChange(sortDirection)
			}
				break
			case 'profile': {
				const profile = this.container.profileHelper.currentProfile
				if (profile) {
					this.fireProfileChange(profile)
				}
			}
				break
			default:
				break
		}
	}

	get onReportPathChange(): Event<ReportPathChangeEvent> {
		return this._reportPathChange.event
	}

	fireReportPathChange(reportPath: UnifiedPath) {
		console.debug('EventFire: EventHandler.fireReportPathChange', {
			timestamp: TimeHelper.getCurrentHighResolutionTime(),
			reportPath: reportPath
		})
		this._reportPathChange.fire({ reportPath: reportPath })
	}

	get onSelectedSensorValueTypeChange(): Event<SelectedSensorValueRepresentationChangeEvent> {
		return this._selectedSensorValueRepresentationChangeEvent.event
	}


	fireSelectedSensorValueTypeChange(sensorValueRepresentation: SensorValueRepresentation) {
		console.debug('EventFire: EventHandler.fireSelectedSensorValueTypeChange', {
			timestamp: TimeHelper.getCurrentHighResolutionTime(),
			selectedSensorValueType: sensorValueRepresentation.selectedSensorValueType,
			selectedValueRepresentation: sensorValueRepresentation.selectedValueRepresentation,
			formula: sensorValueRepresentation.formula
		})
		this._selectedSensorValueRepresentationChangeEvent.fire({ sensorValueRepresentation })
	}

	get onToggleLineAnnotationsChange(): Event<ToggleLineAnnotationsChangeEvent> {
		return this._toggleLineAnnotationsChangeEvent.event
	}

	fireToggleLineAnnotationsChange(enabled: boolean) {
		console.debug('EventFire: EventHandler.fireToggleLineAnnotationsChange', {
			timestamp: TimeHelper.getCurrentHighResolutionTime(),
			enabled: enabled
		})
		this._toggleLineAnnotationsChangeEvent.fire({ enabled: enabled })
	}

	get onFilterPathChange(): Event<FilterPathChangeEvent> {
		return this._filterPathChange.event
	}

	fireFilterPathChange(filterPaths: FilterPaths) {
		console.debug('EventFire: EventHandler.fireFilterPathChange', {
			timestamp: TimeHelper.getCurrentHighResolutionTime(),
			filterPaths
		})
		this._filterPathChange.fire({ filterPaths })
	}

	get onReportLoaded(): Event<ReportLoadedEvent> {
		return this._reportLoaded.event
	}

	fireReportLoaded(type: 'ProjectReport') {
		console.debug('EventFire: EventHandler.fireReportLoaded', {
			timestamp: TimeHelper.getCurrentHighResolutionTime(),
		})
		this._reportLoaded.fire({ type: type })
	}

	get onSourceFileInformationChange(): Event<SourceFileInformationChangeEvent> {
		return this._sourceFileInformationChanged.event
	}

	fireSourceFileInformationChange(absolutePath: UnifiedPath) {
		console.debug('EventFire: EventHandler.fireSourceFileInformationChange', {
			timestamp: TimeHelper.getCurrentHighResolutionTime(),
			absolutePath
		})
		this._sourceFileInformationChanged.fire({ absolutePath })
	}

	get onTextEditorsChangeVisibility(): Event<TextEditorsChangeVisibilityEvent> {
		return this._textEditorsChangeVisibility.event
	}

	fireTextEditorsChangeVisibility(editors: readonly TextEditor[]) {
		console.debug('EventFire: EventHandler.fireTextEditorsChangeVisibility', {
			timestamp: TimeHelper.getCurrentHighResolutionTime()
		})
		this._textEditorsChangeVisibility.fire({
			editors
		})
	}

	get onTextDocumentChange(): Event<TextDocumentChangeEvent> {
		return this._textDocumentChange.event
	}

	fireTextDocumentChange(event: TextDocumentChangeEvent) {
		console.debug('EventFire: EventHandler.fireTextDocumentChange', {
			timestamp: TimeHelper.getCurrentHighResolutionTime()
		})
		this._textDocumentChange.fire(event)
	}

	get onTextEditorChange(): Event<TextEditorChangeEvent> {
		return this._textEditorChange.event
	}

	fireTextEditorChange(editor: TextEditor | undefined) {
		if (editor) {
			console.debug('EventFire: EventHandler.fireTextEditorChange', {
				timestamp: TimeHelper.getCurrentHighResolutionTime(),
				fileName: editor.document.fileName
			})
			this._textEditorChange.fire({ editor: editor })
		}
	}

	get onTextDocumentOpen(): Event<TextDocumentOpenEvent> {
		return this._textDocumentOpen.event
	}

	fireTextDocumentOpen(document: TextDocument) {
		console.debug('EventFire: EventHandler.fireTextDocumentOpen', {
			timestamp: TimeHelper.getCurrentHighResolutionTime(),
			fileName: document.fileName
		})
		this._textDocumentOpen.fire({ document: document })
	}

	get onTextDocumentClose(): Event<TextDocumentCloseEvent> {
		return this._textDocumentClose.event
	}

	fireTextDocumentClose(document: TextDocument) {
		console.debug('EventFire: EventHandler.fireTextDocumentClose', {
			timestamp: TimeHelper.getCurrentHighResolutionTime(),
			fileName: document.fileName
		})
		this._textDocumentClose.fire({ document: document })
	}

	get onSortDirectionChange(): Event<SortDirectionChangeEvent> {
		return this._sortDirectionChange.event
	}

	fireSortDirectionChange(sortDirection: SortDirection) {
		console.debug('EventFire: EventHandler.fireSortDirectionChange', {
			timestamp: TimeHelper.getCurrentHighResolutionTime(),
			sortDirection
		})
		this._sortDirectionChange.fire({ sortDirection })
	}

	get onWebpackRecompile(): Event<WebpackRecompileEvent> {
		return this._webpackRecompile.event
	}

	fireWebpackRecompile() {
		console.debug('EventFire: EventHandler.fireWebpackRecompile', {
			timestamp: TimeHelper.getCurrentHighResolutionTime()
		})
		this._webpackRecompile.fire({})
	}

	get onProfileChange(): Event<ProfileChangeEvent> {
		return this._profileChange.event
	}

	fireProfileChange(profile: Profile) {
		console.debug('EventFire: EventHandler.fireProfileChange', {
			timestamp: TimeHelper.getCurrentHighResolutionTime(),
			profile: profile
		})
		this._profileChange.fire({ profile: profile })
	}
	get onTextDocumentDidSave(): Event<vscode.TextDocument> {
		return this._textDocumentDidSave.event
}

	fireTextDocumentDidSave(document: vscode.TextDocument) {
			console.debug('EventFire: EventHandler.fireTextDocumentDidSave', {
					timestamp: TimeHelper.getCurrentHighResolutionTime()
			})
			this._textDocumentDidSave.fire(document)
	}
}