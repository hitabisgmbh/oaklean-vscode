import vscode, { ExtensionContext } from 'vscode'

import SelectReport from './commands/SelectReport'
import SelectReportFromContextMenu from './commands/SelectReportFromContextMenu'
import EventHandler from './helper/EventHandler'
import { Storage } from './storage'
import TextEditorController from './controller/TextEditorController'
import TextDocumentController from './controller/TextDocumentController'
import { SourceFileMetaDataTreeProvider } from './treeviews/SourceFileMetaDataTreeProvider'
import SelectValueRepresentationCommand from './commands/SelectValueRepresentationCommand'
import SelectSensorValueTypeCommand from './commands/SelectSensorValueTypeCommand'
import ChangeSortDirectionCommands from './commands/ChangeSortDirectionCommands'
import SettingsWebviewController from './controller/SettingsWebviewController'
import { ReportWebviewController } from './controller/ReportWebviewController'
import ToggleLineAnnotationCommands, { ToggleLineAnnotationAction } from './commands/ToggleLineAnnotationCommands'
import FilterCommand from './commands/FilterCommand'
import { MethodViewProvider } from './providers/MethodViewProvider'
import { FilterViewProvider } from './providers/FilterViewProvider'
import SelectProfileCommand from './commands/SelectProfile'
import ProfileHelper from './helper/ProfileHelper'
import { SortDirection } from './types/sortDirection'
import { ReportEditorProvider } from './providers/ReportEditorProvider'
import { EditorFileMethodViewProvider } from './providers/EditorFileMethodViewProvider'
import { GraphicalViewProvider } from './providers/GraphicalViewProvider'
import { SensorValueRepresentation, defaultSensorValueRepresentation } from './types/sensorValueRepresentation'
import ReportBackendStorageController from './controller/ReportBackendStorageController'
import WorkspaceUtils from './helper/WorkspaceUtils'

export class Container {
	static #instance: Container | undefined
	static get instance(): Container | undefined {
		return Container.#instance
	}

	private readonly _settingsWebviewController: SettingsWebviewController
	get settingsWebviewController() {
		return this._settingsWebviewController
	}

	private readonly _reportWebviewController: ReportWebviewController
	get reportWebviewController() {
		return this._reportWebviewController
	}

	private _reportBackendStorageController: ReportBackendStorageController
	get reportBackendStorageController() {
		return this._reportBackendStorageController
	}

	private readonly _context: ExtensionContext
	get context() {
		return this._context
	}

	private readonly _storage: Storage
	get storage() {
		return this._storage
	}

	private readonly _eventHandler: EventHandler
	get eventHandler() {
		return this._eventHandler
	}

	private readonly _textEditorController: TextEditorController
	get textEditorController() {
		return this._textEditorController
	}

	private readonly _textDocumentController: TextDocumentController
	get textDocumentController() {
		return this._textDocumentController
	}

	private readonly _selectReportCommand: SelectReport
	get selectReportCommand() {
		return this._selectReportCommand
	}

	private readonly _selectReportFromContextMenuCommand: SelectReportFromContextMenu
	get selectReportFromContextMenuCommand() {
		return this._selectReportFromContextMenuCommand
	}

	private readonly _selectValueRepresentationCommand: SelectValueRepresentationCommand
	get selectValueRepresentationCommand() {
		return this._selectValueRepresentationCommand
	}

	private readonly _selectSensorValueTypeCommand: SelectSensorValueTypeCommand
	get selectSensorValueTypeCommand() {
		return this._selectSensorValueTypeCommand
	}

	private readonly _selectProfileCommand: SelectProfileCommand
	get selectProfileCommand() {
		return this._selectProfileCommand
	}

	private readonly _changeSortDirectionAscToDescCommand: ChangeSortDirectionCommands
	get changeSortDirectionAscToDescCommand() {
		return this._changeSortDirectionAscToDescCommand
	}

	private readonly _changeSortDirectionDescToDefaultCommand: ChangeSortDirectionCommands
	get changeSortDirectionDescToDefaultCommand() {
		return this._changeSortDirectionDescToDefaultCommand
	}

	private readonly _changeSortDirectionDefaultToAscCommand: ChangeSortDirectionCommands
	get changeSortDirectionDefaultToAscCommand() {
		return this._changeSortDirectionDefaultToAscCommand
	}

	private readonly _disableLineAnnotationsCommand: ToggleLineAnnotationCommands
	get disableLineAnnotationsCommand() {
		return this._disableLineAnnotationsCommand
	}

	private readonly _enableLineAnnotationsCommand: ToggleLineAnnotationCommands
	get enableLineAnnotationsCommand() {
		return this._enableLineAnnotationsCommand
	}

	private readonly _filterCommand: FilterCommand
	get filterCommand() {
		return this._filterCommand
	}
	private readonly _treeDataProvider: SourceFileMetaDataTreeProvider
	get treeDataProvider() {
		return this._treeDataProvider
	}
	private readonly _profileHelper: ProfileHelper
	get profileHelper() {
		return this._profileHelper
	}

	private readonly _methodViewProvider: MethodViewProvider
	get methodViewProvider() {
		return this._methodViewProvider
	}

	private readonly _editorFileMethodViewProvider: EditorFileMethodViewProvider
	get editorFileMethodViewProvider() {
		return this._editorFileMethodViewProvider
	}

	private readonly _graphicalViewProvider: GraphicalViewProvider
	get graphicalViewProvider() {
		return this._graphicalViewProvider

	}

	private readonly _filterViewProvider: FilterViewProvider
	get filterViewProvider() {
		return this._filterViewProvider
	}

	private readonly _reportEditorProvider: ReportEditorProvider
	get reportEditorProvider() {
		return this._reportEditorProvider
	}

	private constructor(
		context: ExtensionContext,
		storage: Storage
	) {
		this._context = context
		this.context.subscriptions.push((this._storage = storage))
		this.context.subscriptions.push((this._eventHandler = new EventHandler(this)))

		// Controllers
		this.context.subscriptions.push((this._textEditorController = new TextEditorController(this)))
		this.context.subscriptions.push((this._textDocumentController = new TextDocumentController(this)))
		this.context.subscriptions.push((this._profileHelper = new ProfileHelper(this)))
		this.context.subscriptions.push((this._settingsWebviewController = new SettingsWebviewController(this)))
		this.context.subscriptions.push((this._reportWebviewController = new ReportWebviewController(this)))
		this.context.subscriptions.push((this._reportBackendStorageController =
			new ReportBackendStorageController(this)))
		// TreeViews
		this._treeDataProvider = new SourceFileMetaDataTreeProvider(
			this
		)
		this.context.subscriptions.push(
			vscode.window.registerTreeDataProvider(
				'SourceFileMetaDataTree',
				this._treeDataProvider
			)
		)
		this.context.subscriptions.push(
			vscode.window.createTreeView('SourceFileMetaDataTree', {
				treeDataProvider: this._treeDataProvider
			})
		)

		// Commands
		this._selectReportCommand = new SelectReport(this)
		this.context.subscriptions.push(this._selectReportCommand.register())

		this._selectReportFromContextMenuCommand = new SelectReportFromContextMenu(this)
		this.context.subscriptions.push(this._selectReportFromContextMenuCommand.register())

		this._selectValueRepresentationCommand = new SelectValueRepresentationCommand(this, this._treeDataProvider)
		this.context.subscriptions.push(this._selectValueRepresentationCommand.register())

		this._selectSensorValueTypeCommand = new SelectSensorValueTypeCommand(this, this._treeDataProvider)
		this.context.subscriptions.push(this._selectSensorValueTypeCommand.register())


		this._selectProfileCommand = new SelectProfileCommand(this)
		this.context.subscriptions.push(this._selectProfileCommand.register())

		this._disableLineAnnotationsCommand = new ToggleLineAnnotationCommands(this, ToggleLineAnnotationAction.disable)
		this.context.subscriptions.push(this._disableLineAnnotationsCommand.register())

		this._enableLineAnnotationsCommand = new ToggleLineAnnotationCommands(this, ToggleLineAnnotationAction.enable)
		this.context.subscriptions.push(this._enableLineAnnotationsCommand.register())

		this._changeSortDirectionAscToDescCommand = new ChangeSortDirectionCommands(
			this,
			this._treeDataProvider,
			SortDirection.desc
		)
		this._changeSortDirectionDescToDefaultCommand = new ChangeSortDirectionCommands(
			this,
			this._treeDataProvider,
			SortDirection.default
		)
		this._changeSortDirectionDefaultToAscCommand = new ChangeSortDirectionCommands(
			this,
			this._treeDataProvider,
			SortDirection.asc
		)
		this.context.subscriptions.push(this._changeSortDirectionAscToDescCommand.register())
		this.context.subscriptions.push(this._changeSortDirectionDescToDefaultCommand.register())
		this.context.subscriptions.push(this._changeSortDirectionDefaultToAscCommand.register())

		this._filterCommand = new FilterCommand(this, this._treeDataProvider)
		this.context.subscriptions.push(this._filterCommand.register())

		//webview providers
		this._methodViewProvider = new MethodViewProvider(this.context.extensionUri, this)
		this.context.subscriptions.push(
			vscode.window.registerWebviewViewProvider(
				MethodViewProvider.viewType, this._methodViewProvider
			))

		this._filterViewProvider = new FilterViewProvider(this.context.extensionUri, this)
		this.context.subscriptions.push(
			vscode.window.registerWebviewViewProvider(
				FilterViewProvider.viewType, this._filterViewProvider
			))
		this._reportEditorProvider = new ReportEditorProvider(this)
		this.context.subscriptions.push(
			vscode.window.registerCustomEditorProvider(
				'oaklean.oak', this.reportEditorProvider
			)
		)

		vscode.commands.registerCommand('oaklean.openDynamicFile', (file: string) => {
			const resolvedPath = WorkspaceUtils.getFullFilePath(file)
			if (resolvedPath){
				vscode.commands.executeCommand('vscode.open', vscode.Uri.file(resolvedPath.toPlatformString()))
			}
		})

		this._editorFileMethodViewProvider = new EditorFileMethodViewProvider(context.extensionUri, this)
		this.context.subscriptions.push(
			vscode.window.registerWebviewViewProvider(
				EditorFileMethodViewProvider.viewType, this._editorFileMethodViewProvider
			))

		this._graphicalViewProvider = new GraphicalViewProvider(context.extensionUri, this)
		this.context.subscriptions.push(
			vscode.window.registerWebviewViewProvider(
				GraphicalViewProvider.viewType, this._graphicalViewProvider
			))
		this._eventHandler.fireInitialEvents()
	}

	static create(
		context: ExtensionContext,
		storage: Storage
	) {
		if (Container.#instance !== undefined) {
			throw new Error('Container is already initialized')
		}

		Container.#instance = new Container(context, storage)
		const sensorValueRepresentation = storage.getWorkspace('sensorValueRepresentation') as SensorValueRepresentation
		if (sensorValueRepresentation === undefined) {
			storage.storeWorkspace('sensorValueRepresentation', defaultSensorValueRepresentation())
		}

		return Container.#instance
	}
}
