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
import ThemeColorViewerCommands from './commands/ThemeColorViewerCommands'
import SettingsCommand from './commands/SettingsCommand'
import ToggleLineAnnotationCommands, { ToggleLineAnnotationAction } from './commands/ToggleLineAnnotationCommands'
import { MethodViewProvider } from './WebViewProviders/MethodViewProvider'
import { FilterViewProvider } from './WebViewProviders/FilterViewProvider'
import SelectProfileCommand from './commands/SelectProfile'
import ProfileHelper from './helper/ProfileHelper'
import { SortDirection } from './types/sortDirection'
import { ReportEditorProvider } from './EditorProviders/ReportEditorProvider'
import { EditorFileMethodViewProvider } from './WebViewProviders/EditorFileMethodViewProvider'
import { GraphicalViewProvider } from './WebViewProviders/GraphicalViewProvider'
import { SensorValueRepresentation, defaultSensorValueRepresentation } from './types/sensorValueRepresentation'
import ReportBackendStorageController from './controller/ReportBackendStorageController'
import WorkspaceUtils from './helper/WorkspaceUtils'
import OpenSourceLocationCommand from './commands/OpenSourceLocationCommand'
import { SensorValueHoverProvider } from './hover/SensorValueHoverProvider'

export class Container {
	static #instance: Container | undefined
	static get instance(): Container | undefined {
		return Container.#instance
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

	private readonly _settingsCommand: SettingsCommand
	get settingsWebviewController() {
		return this._settingsCommand
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

	private readonly _openSourceLocationCommand: OpenSourceLocationCommand
	get openSourceLocationCommand() {
		return this._openSourceLocationCommand
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

	private readonly _showThemeColorViewerCommand: ThemeColorViewerCommands
	get showThemeColorViewerCommand() {
		return this._showThemeColorViewerCommand
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
		this.context.subscriptions.push((this._reportBackendStorageController =
			new ReportBackendStorageController(this)))

		// Hover Provider
		this.context.subscriptions.push(SensorValueHoverProvider.register(this))

		// TreeViews
		this.context.subscriptions.push(this._treeDataProvider = new SourceFileMetaDataTreeProvider(this))
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
		this.context.subscriptions.push((this._settingsCommand = new SettingsCommand(this)))
		this.context.subscriptions.push(this._settingsCommand.register())
		this.context.subscriptions.push(this._showThemeColorViewerCommand = new ThemeColorViewerCommands(this))
		this.context.subscriptions.push(this._showThemeColorViewerCommand.register())
		this.context.subscriptions.push(this._selectReportCommand = new SelectReport(this))
		this.context.subscriptions.push(this._selectReportCommand.register())
		this.context.subscriptions.push(this._openSourceLocationCommand = new OpenSourceLocationCommand(this))
		this.context.subscriptions.push(this._openSourceLocationCommand.register())

		this.context.subscriptions.push(
			this._selectReportFromContextMenuCommand = new SelectReportFromContextMenu(this)
		)
		this.context.subscriptions.push(this._selectReportFromContextMenuCommand.register())

		this.context.subscriptions.push(
			this._selectValueRepresentationCommand = new SelectValueRepresentationCommand(this, this._treeDataProvider)
		)
		this.context.subscriptions.push(this._selectValueRepresentationCommand.register())

		this.context.subscriptions.push(
			this._selectSensorValueTypeCommand = new SelectSensorValueTypeCommand(this, this._treeDataProvider)
		)
		this.context.subscriptions.push(this._selectSensorValueTypeCommand.register())

		this.context.subscriptions.push(
			this._selectProfileCommand = new SelectProfileCommand(this)
		)
		this.context.subscriptions.push(this._selectProfileCommand.register())

		this.context.subscriptions.push(
			this._disableLineAnnotationsCommand =
				new ToggleLineAnnotationCommands(this, ToggleLineAnnotationAction.disable)
		)
		this.context.subscriptions.push(this._disableLineAnnotationsCommand.register())

		this.context.subscriptions.push(
			this._enableLineAnnotationsCommand =
				new ToggleLineAnnotationCommands(this, ToggleLineAnnotationAction.enable)
		)
		this.context.subscriptions.push(this._enableLineAnnotationsCommand.register())

		this.context.subscriptions.push(
			this._changeSortDirectionAscToDescCommand = new ChangeSortDirectionCommands(
				this,
				this._treeDataProvider,
				SortDirection.desc
			)
		)
		this.context.subscriptions.push(
			this._changeSortDirectionDescToDefaultCommand = new ChangeSortDirectionCommands(
				this,
				this._treeDataProvider,
				SortDirection.default
			)
		)
		this.context.subscriptions.push(
			this._changeSortDirectionDefaultToAscCommand = new ChangeSortDirectionCommands(
				this,
				this._treeDataProvider,
				SortDirection.asc
			)
		)
		this.context.subscriptions.push(this._changeSortDirectionAscToDescCommand.register())
		this.context.subscriptions.push(this._changeSortDirectionDescToDefaultCommand.register())
		this.context.subscriptions.push(this._changeSortDirectionDefaultToAscCommand.register())

		//webview providers
		this.context.subscriptions.push(
			this._methodViewProvider = new MethodViewProvider(this.context.extensionUri, this)
		)
		this.context.subscriptions.push(
			vscode.window.registerWebviewViewProvider(
				MethodViewProvider.viewType, this._methodViewProvider
			))

		this.context.subscriptions.push(
			this._filterViewProvider = new FilterViewProvider(this.context.extensionUri, this)
		)
		this.context.subscriptions.push(
			vscode.window.registerWebviewViewProvider(
				FilterViewProvider.viewType, this._filterViewProvider
			))
		this.context.subscriptions.push(this._reportEditorProvider = new ReportEditorProvider(this))
		this.context.subscriptions.push(
			vscode.window.registerCustomEditorProvider(
				'oaklean.oak', this._reportEditorProvider, {
					webviewOptions: {
						retainContextWhenHidden: true
					},
					supportsMultipleEditorsPerDocument: false
				}
			)
		)

		this.context.subscriptions.push(
			vscode.commands.registerCommand('oaklean.openDynamicFile', (file: string) => {
				const config = this._textDocumentController.config
				if (!config) {
					return
				}
				const resolvedPath = WorkspaceUtils.getFullFilePath(config, file)
				if (resolvedPath) {
					vscode.commands.executeCommand('vscode.open', vscode.Uri.file(resolvedPath.toPlatformString()))
				}
			})
		)

		this.context.subscriptions.push(
			this._editorFileMethodViewProvider = new EditorFileMethodViewProvider(context.extensionUri, this)
		)
		this.context.subscriptions.push(
			vscode.window.registerWebviewViewProvider(
				EditorFileMethodViewProvider.viewType, this._editorFileMethodViewProvider
			))

		this.context.subscriptions.push(
			this._graphicalViewProvider = new GraphicalViewProvider(context.extensionUri, this)
		)
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
