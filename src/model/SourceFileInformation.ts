import vscode from 'vscode'
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

const VALID_EXTENSIONS_TO_PARSE = [
	'.js',
	'.jsx',
	'.ts',
	'.tsx'
]

export class SourceFileInformation {
	private _fileName: UnifiedPath
	private _programStructureTree: ProgramStructureTree

	constructor(document: vscode.TextDocument) {
		this._fileName = new UnifiedPath(document.fileName)
		this._programStructureTree = TypescriptParser.parseSource(
			this._fileName,
			document.getText()
		)
	}

	get programStructureTree(): ProgramStructureTree {
		return this._programStructureTree
	}

	static fromDocument(document: vscode.TextDocument): SourceFileInformation | undefined {
		const fileName = new UnifiedPath(document.fileName)
		if (!VALID_EXTENSIONS_TO_PARSE.includes(fileName.extname().toLowerCase())) {
			return // wrong file extension, do not parse the file
		}
		return new SourceFileInformation(document)
	}
}
