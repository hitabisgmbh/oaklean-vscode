import * as path from 'path'

import vscode from 'vscode'
import { Disposable, TextDocument, TextDocumentChangeEvent } from 'vscode'
import {
	UnifiedPath,
	SourceFileMetaDataTreeType,
	SourceFileMetaDataTree,
	ProjectReport,
	SourceFileMetaData,
	ProgramStructureTree,
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
import { SourceFileInformation } from '../model/SourceFileInformation'

export type ProfileInfoOfFile = {
	projectReport: ProjectReport | undefined,
	sourceFileMetaData: SourceFileMetaData | undefined
	programStructureTreeOfFile: ProgramStructureTree | undefined
}

export default class TextDocumentController implements Disposable {
	private readonly _disposable: Disposable
	container: Container
	sourceFileInformationPerDocument: Map<string, SourceFileInformation> 

	constructor(container: Container) {
		this.container = container
		this.sourceFileInformationPerDocument = new Map()

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

	getReportInfoOfFile(relativeWorkspacePath: UnifiedPath): ProfileInfoOfFile {
		return {
			projectReport: this.projectReport,
			sourceFileMetaData: this.getSourceFileMetaData(relativeWorkspacePath),
			programStructureTreeOfFile: this.getProgramStructureTreeOfFile(relativeWorkspacePath)
		}
	}

	getSourceFileInformationOfFile(relativeWorkspacePath: UnifiedPath): SourceFileInformation | undefined {
		return this.sourceFileInformationPerDocument.get(relativeWorkspacePath.toString())
	}

	getProgramStructureTreeOfFile(relativeWorkspacePath: UnifiedPath): ProgramStructureTree | undefined {
		return this.getSourceFileInformationOfFile(relativeWorkspacePath)?.programStructureTree
	}

	getSourceFileMetaData(
		relativeWorkspacePath: UnifiedPath
	): SourceFileMetaData | undefined {
		return this.getSourceFileInformationOfFile(relativeWorkspacePath)?.sourceFileMetaData
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
		this.setSourceFileInformationOfDocument(event.document)
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

	setSourceFileInformationOfDocument(document: TextDocument) {
		if (this.config === undefined || this.projectReport === undefined || this.reportPath === undefined) {
			return
		}
		const sourceFileInformation = SourceFileInformation.fromDocument(
			this.reportPath,
			this.projectReport,
			document
		)
		if (sourceFileInformation !== undefined) {
			this.sourceFileInformationPerDocument.set(
				sourceFileInformation.relativeWorkspacePath.toString(),
				sourceFileInformation
			)
			this.container.eventHandler.fireSourceFileInformationChange(sourceFileInformation.absoluteFilePath)
		}
	}

	unsetSourceFileInformationOfDocument(document: TextDocument) {
		if (this.config === undefined) {
			return
		}
		const relativeWorkspacePath = WorkspaceUtils.getRelativeWorkspacePath(document.fileName)
		if (relativeWorkspacePath === undefined) {
			return
		}

		const existed = this.sourceFileInformationPerDocument.has(relativeWorkspacePath.toString())
		this.sourceFileInformationPerDocument.delete(relativeWorkspacePath.toString())
		if (existed) {
			console.debug('Remove ProgramStructureTree of File from Cache', {
				fileName: relativeWorkspacePath.toString()
			})
		}
	}

	documentOpened(event: TextDocumentOpenEvent) {
		this.setSourceFileInformationOfDocument(event.document)
	}

	documentClosed(event: TextDocumentCloseEvent) {
		this.unsetSourceFileInformationOfDocument(event.document)
	}

	dispose() {
		this._disposable.dispose()
	}
}