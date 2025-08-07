import vscode from 'vscode'
import {
	NodeModule,
	NodeModuleUtils,
	Report,
	UnifiedPath,
	ProjectReport,
	SourceFileMetaData,
	ProgramStructureTree,
	TypescriptParser,
	ProfilerConfig,
	STATIC_CONFIG_FILENAME
} from '@oaklean/profiler-core'

import WorkspaceUtils from '../helper/WorkspaceUtils'

const VALID_EXTENSIONS_TO_PARSE = [
	'.js',
	'.jsx',
	'.ts',
	'.tsx'
]

export class SourceFileInformation {
	private _projectReport: ProjectReport
	private _reportPath: UnifiedPath
	// relative to the workspace root
	private _relativeWorkspacePath: UnifiedPath
	// the absolute file path is the path to the file on disk
	private _absoluteFilePath: UnifiedPath
	private _sourceFileMetaData: SourceFileMetaData | undefined
	private _programStructureTree: ProgramStructureTree

	constructor(
		reportPath: UnifiedPath,
		projectReport: ProjectReport,
		relativeWorkspacePath: UnifiedPath,
		document: vscode.TextDocument
	) {
		this._reportPath = reportPath
		this._projectReport = projectReport
		this._relativeWorkspacePath = relativeWorkspacePath
		this._absoluteFilePath = new UnifiedPath(document.fileName)
		this._programStructureTree = TypescriptParser.parseSource(
			this._absoluteFilePath,
			document.getText()
		)
		this._sourceFileMetaData = SourceFileInformation.resolveSourceFileMetaData({
			reportPath: this._reportPath,
			projectReport: this._projectReport,
			absoluteFilePath: this._absoluteFilePath
		})
	}

	get absoluteFilePath(): UnifiedPath {
		return this._absoluteFilePath
	}

	get relativeWorkspacePath(): UnifiedPath {
		return this._relativeWorkspacePath
	}

	get sourceFileMetaData(): SourceFileMetaData | undefined {
		return this._sourceFileMetaData
	}

	get programStructureTree(): ProgramStructureTree {
		return this._programStructureTree
	}

	static resolveSourceFileMetaData(
		args: {
			reportPath: UnifiedPath,
			projectReport: ProjectReport,
			absoluteFilePath: UnifiedPath
		}
	): SourceFileMetaData | undefined {
		let reportPath = args.reportPath
		let reportToRequest: Report = args.projectReport
		let filePath = args.absoluteFilePath

		const absoluteNodeModulePath = NodeModuleUtils.getParentModuleFromPath(args.absoluteFilePath)
		if (absoluteNodeModulePath) {
			const nodeModule = NodeModule.fromNodeModulePath(absoluteNodeModulePath)

			if (nodeModule) {
				const moduleIndex = args.projectReport.getModuleIndex('get', nodeModule.identifier)
				const moduleReport = moduleIndex !== undefined ?
					args.projectReport.extern.get(moduleIndex.id) : undefined
				if (moduleReport) {
					reportToRequest = moduleReport

					// pretend there is a config file within the node module
					// this needs to be done, since all paths are resolved relative to the config file
					reportPath = absoluteNodeModulePath.join(STATIC_CONFIG_FILENAME)
					filePath = absoluteNodeModulePath.pathTo(args.absoluteFilePath)
				}
			}
		}

		const result = reportToRequest.getMetaDataFromFile(
			reportPath,
			filePath
		)
		return result
	}

	static fromDocument(
		reportPath: UnifiedPath,
		projectReport: ProjectReport,
		document: vscode.TextDocument
	): SourceFileInformation | undefined {
		const relativeWorkspacePath = WorkspaceUtils.getRelativeWorkspacePath(
			document.fileName
		)
		if (relativeWorkspacePath === undefined) {
			return undefined
		}

		const fileName = new UnifiedPath(document.fileName)
		if (!VALID_EXTENSIONS_TO_PARSE.includes(fileName.extname().toLowerCase())) {
			return // wrong file extension, do not parse the file
		}
		return new SourceFileInformation(
			reportPath,
			projectReport,
			relativeWorkspacePath,
			document
		)
	}
}
