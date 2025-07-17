import * as path from 'path'

import vscode from 'vscode'
import { Disposable, TextDocument, TextDocumentChangeEvent } from 'vscode'
import {
	NodeModule,
	NodeModuleUtils,
	Report,
	UnifiedPath,
	SourceFileMetaDataTreeType,
	SourceFileMetaDataTree,
	ProjectReport,
	SourceFileMetaData,
	ProgramStructureTree,
	TypescriptParser,
	ProfilerConfig,
	STATIC_CONFIG_FILENAME
} from '@oaklean/profiler-core'

import {
	ReportPathChangeEvent,
	TextDocumentOpenEvent,
	TextDocumentCloseEvent
} from '../helper/EventHandler'
import { Container } from '../container'
import WorkspaceUtils from '../helper/WorkspaceUtils'
import { INFO_PROJECT_REPORT } from '../constants/infoMessages'
import { ProjectReportHelper } from '../helper/ProjectReportHelper'

const VALID_EXTENSIONS_TO_PARSE = [
	'.js',
	'.jsx',
	'.ts',
	'.tsx'
]

export type ProfileInfoOfFile = {
	projectReport: ProjectReport | undefined,
	sourceFileMetaData: SourceFileMetaData | undefined
	programStructureTreeOfFile: ProgramStructureTree | undefined
}

export default class TextDocumentController implements Disposable {
	private readonly _disposable: Disposable
	container: Container
	programStructureTreePerDocument: Record<string, ProgramStructureTree>

	constructor(container: Container) {
		this.container = container
		this.programStructureTreePerDocument = {}

		this._disposable = Disposable.from(
			this.container.eventHandler.onReportPathChange(this.reportPathChanged.bind(this)),
			this.container.eventHandler.onTextDocumentOpen(this.documentOpened.bind(this)),
			this.container.eventHandler.onTextDocumentClose(this.documentClosed.bind(this)),
			this.container.eventHandler.onTextDocumentChange(this.documentChanged.bind(this)),
			this.container.eventHandler.onTextDocumentDidSave(this.documentSaved.bind(this))
		)
	}

	private _reportPath: UnifiedPath | undefined
	get reportPath(): UnifiedPath | undefined {
		return this._reportPath
	}

	private set reportPath(value: UnifiedPath | undefined) {
		this._reportPath = value
	}

	private _config: ProfilerConfig | undefined
	get config(): ProfilerConfig | undefined {
		return this._config
	}

	private set config(value: ProfilerConfig | undefined) {
		this._config = value
	}

	private _projectReport: ProjectReport | undefined
	get projectReport(): ProjectReport | undefined {
		return this._projectReport
	}

	private set projectReport(value: ProjectReport | undefined) {
		this._projectReport = value
	}

	private _sourceFileMetaDataTree: SourceFileMetaDataTree<SourceFileMetaDataTreeType> | undefined
	get sourceFileMetaDataTree(): SourceFileMetaDataTree<SourceFileMetaDataTreeType> | undefined {
		return this._sourceFileMetaDataTree
	}

	private set sourceFileMetaDataTree(value: SourceFileMetaDataTree<SourceFileMetaDataTreeType> | undefined) {
		this._sourceFileMetaDataTree = value
	}

	getReportInfoOfFile(fileName: UnifiedPath): ProfileInfoOfFile {
		return {
			projectReport: this.projectReport,
			sourceFileMetaData: this.getSourceFileMetaData(fileName),
			programStructureTreeOfFile: this.getProgramStructureTreeOfFile(fileName)
		}
	}

	getProgramStructureTreeOfFile(fileName: UnifiedPath): ProgramStructureTree | undefined {
		return this.programStructureTreePerDocument[fileName.toString()]
	}

	getSourceFileMetaData(
		filePathRelativeToWorkspace: UnifiedPath
	): SourceFileMetaData | undefined {
		if (!this.reportPath || !this.projectReport) {
			return undefined
		}

		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!workspaceDir) {
			return
		}

		let reportToRequest: Report = this.projectReport
		let reportPath = this.reportPath
		let filePath = workspaceDir.join(filePathRelativeToWorkspace)

		const nodeModulePath = NodeModuleUtils.getParentModuleFromPath(filePathRelativeToWorkspace)
		if (nodeModulePath) {
			const nodeModule = NodeModule.fromNodeModulePath(workspaceDir.join(nodeModulePath))

			if (nodeModule) {
				const moduleIndex = this.projectReport.getModuleIndex('get', nodeModule.identifier)
				const moduleReport = moduleIndex !== undefined ?
					this.projectReport.extern.get(moduleIndex.id) : undefined
				if (moduleReport) {
					reportToRequest = moduleReport

					// pretend there is a config file within the node module
					// this needs to be done, since all paths are resolved relative to the config file
					reportPath = workspaceDir.join(nodeModulePath).join(STATIC_CONFIG_FILENAME)
					filePath = nodeModulePath.pathTo(filePathRelativeToWorkspace)
				}
			}
		}
		const result = reportToRequest.getMetaDataFromFile(
			reportPath,
			filePath
		)


		return result
	}

	reportPathChanged(event: ReportPathChangeEvent) {
		this.reportPath = event.reportPath
		const config = WorkspaceUtils.autoResolveConfigFromReportPath(this.reportPath)
		if (config !== null) {
			this.config = config
		}
		const report = ProjectReportHelper.loadReport(this.reportPath)
		if (report === null) {
			return
		}
		this.projectReport = report
		if (this.projectReport) {
			try {
				this.sourceFileMetaDataTree = SourceFileMetaDataTree.fromProjectReport(this.projectReport)
			} catch (e) {
				this.sourceFileMetaDataTree = undefined
			}
		}
		vscode.window.showInformationMessage(INFO_PROJECT_REPORT + this.reportPath.basename())
		this.container.eventHandler.fireReportLoaded('ProjectReport')
	}

	documentChanged(event: TextDocumentChangeEvent) {
		this.setProgramStructureTreeOfDocument(event.document)
	}

	documentSaved(document: TextDocument) {
		if (path.basename(document.uri.path).toLowerCase() === STATIC_CONFIG_FILENAME) {
			const savedConfigFilePath = new UnifiedPath(document.uri.path)
			const { config: changedConfig, error } = WorkspaceUtils.resolveConfigFromFile(savedConfigFilePath)
			if (changedConfig === undefined) {
				vscode.window.showWarningMessage('Saved .oaklean config file has an invalid format: ' + error)
			}
			const currentLoadedConfigPath = this.config?.filePath
			if (currentLoadedConfigPath && savedConfigFilePath.toString() === currentLoadedConfigPath.toString()) {
				if (changedConfig) {
					this.config = changedConfig
				}
			}
		}
	}

	setProgramStructureTreeOfDocument(document: TextDocument) {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!workspaceDir) {
			return
		}

		const fileName = new UnifiedPath(document.fileName)
		if (!VALID_EXTENSIONS_TO_PARSE.includes(path.extname(fileName.toJSON()).toLowerCase())) {
			return // wrong file extension, do not parse the file
		}

		const filePathRelativeToWorkspace = workspaceDir.pathTo(fileName)

		this.programStructureTreePerDocument[filePathRelativeToWorkspace.toString()] =
			TypescriptParser.parseSource(
				fileName,
				document.getText()
			)
		this.container.eventHandler.fireProgramStructureTreeChange(filePathRelativeToWorkspace)
	}

	unsetProgramStructureTreeOfDocument(document: TextDocument) {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!workspaceDir) {
			return
		}

		const fileName = document.fileName
		const filePathRelativeToWorkspace = workspaceDir.pathTo(fileName)

		const existed = (filePathRelativeToWorkspace.toString() in this.programStructureTreePerDocument)
		delete this.programStructureTreePerDocument[filePathRelativeToWorkspace.toString()]
		if (existed) {
			console.debug('Remove ProgramStructureTree of File from Cache', {
				fileName: filePathRelativeToWorkspace.toString()
			})
		}
	}

	documentOpened(event: TextDocumentOpenEvent) {
		this.setProgramStructureTreeOfDocument(event.document)
	}

	documentClosed(event: TextDocumentCloseEvent) {
		this.unsetProgramStructureTreeOfDocument(event.document)
	}

	dispose() {
		this._disposable.dispose()
	}
}