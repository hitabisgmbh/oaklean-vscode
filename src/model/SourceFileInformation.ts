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
	STATIC_CONFIG_FILENAME,
	SourceNodeMetaData,
	SourceNodeMetaDataType
} from '@oaklean/profiler-core'

const VALID_EXTENSIONS_TO_PARSE = ['.js', '.jsx', '.ts', '.tsx']

export type SourceNodeMetaDataDirect = SourceNodeMetaData<
	| SourceNodeMetaDataType.SourceNode
	| SourceNodeMetaDataType.LangInternalSourceNode
>

export class SourceFileInformation {
	private _document: vscode.TextDocument
	private _projectReport: ProjectReport
	private _reportPath: UnifiedPath
	// relative to the workspace root
	private _relativeWorkspacePath: UnifiedPath
	// the absolute file path is the path to the file on disk
	private _absoluteFilePath: UnifiedPath

	// get calculated only on demand
	private _sourceFileMetaData: SourceFileMetaData | undefined | null
	private _programStructureTree: ProgramStructureTree | undefined
	private _sourceNodeMetaDataIndex:
		| {
				byLine: Map<number, SourceNodeMetaDataDirect[]>
		}
		| undefined

	constructor(
		reportPath: UnifiedPath,
		projectReport: ProjectReport,
		relativeWorkspacePath: UnifiedPath,
		document: vscode.TextDocument
	) {
		this._document = document
		this._reportPath = reportPath
		this._projectReport = projectReport
		this._relativeWorkspacePath = relativeWorkspacePath
		this._absoluteFilePath = new UnifiedPath(document.fileName)
	}

	update(
		reportPath: UnifiedPath,
		projectReport: ProjectReport,
	) {
		this._reportPath = reportPath
		this._projectReport = projectReport
		this.invalidate()
	}

	invalidate() {
		this._sourceFileMetaData = undefined
		this._programStructureTree = undefined
		this._sourceNodeMetaDataIndex = undefined
	}

	get sourceNodeMetaDataByLine() {
		return this.sourceNodeMetaDataIndex?.byLine
	}

	get sourceNodeMetaDataIndex() {
		if (this._sourceNodeMetaDataIndex !== undefined) {
			return this._sourceNodeMetaDataIndex
		}
		const sourceFileMetaData = this.sourceFileMetaData
		if (sourceFileMetaData === null) {
			return null
		}
		const sourceNodeMetaDataByLine = new Map<
			number,
			SourceNodeMetaDataDirect[]
		>()
		for (const sourceNodeMetaData of sourceFileMetaData.functions.values()) {
			const sourceNodeIndex = sourceNodeMetaData.getIndex()
			if (sourceNodeIndex === undefined) {
				continue
			}
			const locationOfFunction =
				this.programStructureTree.sourceLocationOfIdentifier(
					sourceNodeIndex.identifier
				)
			if (locationOfFunction === null) {
				continue
			}
			let existing = sourceNodeMetaDataByLine.get(
				locationOfFunction.beginLoc.line - 1
			)
			if (existing === undefined) {
				existing = []
				sourceNodeMetaDataByLine.set(
					locationOfFunction.beginLoc.line - 1,
					existing
				)
			}
			existing.push(sourceNodeMetaData)
		}
		this._sourceNodeMetaDataIndex = {
			byLine: sourceNodeMetaDataByLine
		}
		return this._sourceNodeMetaDataIndex
	}

	get absoluteFilePath(): UnifiedPath {
		return this._absoluteFilePath
	}

	get relativeWorkspacePath(): UnifiedPath {
		return this._relativeWorkspacePath
	}

	get sourceFileMetaData(): SourceFileMetaData | null {
		if (this._sourceFileMetaData !== undefined) {
			return this._sourceFileMetaData
		}
		this._sourceFileMetaData =
			SourceFileInformation.resolveSourceFileMetaData({
				reportPath: this._reportPath,
				projectReport: this._projectReport,
				absoluteFilePath: this._absoluteFilePath
			}) || null
		return this._sourceFileMetaData
	}

	get programStructureTree(): ProgramStructureTree {
		if (this._programStructureTree !== undefined) {
			return this._programStructureTree
		}
		this._programStructureTree = TypescriptParser.parseSource(
			this._absoluteFilePath,
			this._document.getText()
		)

		return this._programStructureTree
	}

	static resolveSourceFileMetaData(args: {
		reportPath: UnifiedPath
		projectReport: ProjectReport
		absoluteFilePath: UnifiedPath
	}): SourceFileMetaData | undefined {
		let reportPath = args.reportPath
		let reportToRequest: Report = args.projectReport
		let filePath = args.absoluteFilePath

		const absoluteNodeModulePath = NodeModuleUtils.getParentModuleFromPath(
			args.absoluteFilePath
		)
		if (absoluteNodeModulePath) {
			const nodeModule = NodeModule.fromNodeModulePath(absoluteNodeModulePath)

			if (nodeModule) {
				const moduleIndex = args.projectReport.getModuleIndex(
					'get',
					nodeModule.identifier
				)
				const moduleReport =
					moduleIndex !== undefined
						? args.projectReport.extern.get(moduleIndex.id)
						: undefined
				if (moduleReport) {
					reportToRequest = moduleReport

					// pretend there is a config file within the node module
					// this needs to be done, since all paths are resolved relative to the config file
					reportPath = absoluteNodeModulePath.join(STATIC_CONFIG_FILENAME)
					filePath = absoluteNodeModulePath.pathTo(args.absoluteFilePath)
				}
			}
		}

		const result = reportToRequest.getMetaDataFromFile(reportPath, filePath)
		return result
	}

	static fromDocument(
		reportPath: UnifiedPath,
		projectReport: ProjectReport,
		relativeWorkspacePath: UnifiedPath,
		document: vscode.TextDocument
	): SourceFileInformation | undefined {
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
