import vscode, { Disposable, TextEditor, TextEditorDecorationType } from 'vscode'
import { SourceNodeMetaData, SourceNodeMetaDataType } from '@oaklean/profiler-core'

import { Container } from '../container'
import { ReportLoadedEvent, ProgramStructureTreeChangeEvent, TextEditorChangeEvent, SelectedSensorValueRepresentationChangeEvent, ToggleLineAnnotationsChangeEvent } from '../helper/EventHandler'
import { TextDocumentHighlighter } from '../helper/TextDocumentHighlighter'
import WorkspaceUtils from '../helper/WorkspaceUtils'
import { SensorValueHoverProvider } from '../hover/SensorValueHoverProvider'
import { SensorValueRepresentation } from '../types/sensorValueRepresentation'
export default class TextEditorController implements Disposable {
	private _sensorValueRepresentation: SensorValueRepresentation
	private _enableLineAnnotations: boolean
	private readonly _disposable: Disposable
	container: Container
	editor: TextEditor | undefined
	textDecorations: TextEditorDecorationType[]
	private sensorValueHoverProvider: vscode.Disposable | undefined
	constructor(container: Container) {
		this.container = container
		this._disposable = Disposable.from(
			this.container.eventHandler.onTextEditorChange(this.textEditorChanged.bind(this)),
			this.container.eventHandler.onProgramStructureTreeChange(this.programStructureTreeChanged.bind(this)),
			this.container.eventHandler.onReportLoaded(this.reportLoaded.bind(this)),
			this.container.eventHandler.onSelectedSensorValueTypeChange(this.selectedSensorValueTypeChanged.bind(this)),
			this.container.eventHandler.onToggleLineAnnotationsChange(this.toggleLineAnnotationsChange.bind(this)),
			vscode.window.onDidChangeActiveColorTheme(() => {
				this.refresh()
			})
		)
		this.textDecorations = []
		this._enableLineAnnotations = this.container.storage.getWorkspace('enableLineAnnotations', true) as boolean
		this._sensorValueRepresentation = this.container.storage.getWorkspace('sensorValueRepresentation') as SensorValueRepresentation
	}

	toggleLineAnnotationsChange(event: ToggleLineAnnotationsChangeEvent) {
		this._enableLineAnnotations = event.enabled
		this.refresh()
	}


	selectedSensorValueTypeChanged(event: SelectedSensorValueRepresentationChangeEvent) {
		this._sensorValueRepresentation = event.sensorValueRepresentation
		this.refresh()
	}

	reportLoaded(event: ReportLoadedEvent) {
		this.refresh()
	}

	textEditorChanged(event: TextEditorChangeEvent) {
		this.setEditor(event.editor)
	}

	programStructureTreeChanged(event: ProgramStructureTreeChangeEvent) {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!this.editor || !workspaceDir) {
			return
		}
		const filePathRelativeToWorkspace = workspaceDir.pathTo(this.editor.document.fileName)

		if (filePathRelativeToWorkspace.toString() === event.fileName.toString()) {
			this.refresh()
		}
	}

	dispose() {
		this._disposable.dispose()
		this.disposeTextDecorations()
		this.disposeSensorValueHoverProvider()
	}

	disposeTextDecorations() {
		for (const textDecoration of this.textDecorations) {
			textDecoration.dispose()
		}
	}

	disposeSensorValueHoverProvider() {
		if (this.sensorValueHoverProvider) {
			this.sensorValueHoverProvider.dispose()
			this.sensorValueHoverProvider = undefined
		}
	}
	refresh() {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!this.editor || !workspaceDir) {
			return
		}

		// Dispose existing decorations
		this.disposeTextDecorations()

		if (!this._enableLineAnnotations) {
			return
		}

		const filePathRelativeToWorkspace = workspaceDir.pathTo(this.editor.document.fileName)
		// Get the decorations from TextDocumentHighlighter
		const decorations = TextDocumentHighlighter.lineAnnotationsByReport(
			this.editor,
			this._sensorValueRepresentation,
			filePathRelativeToWorkspace,
			this.container
		)
		const hoverObjects: {
			decoration: TextEditorDecorationType;
			decorationRange: vscode.Range;
			sourceNodeMetaData: SourceNodeMetaData<
			SourceNodeMetaDataType.SourceNode |
			SourceNodeMetaDataType.LangInternalSourceNode
			>;
		}[] = []

		// Apply the new decorations and store TextEditorDecorationType instances
		for (const { decoration, decorationRange, sourceNodeMetaData } of decorations) {
			this.textDecorations.push(decoration)
			this.editor.setDecorations(decoration, [decorationRange])
			const hoverObject = {
				decoration,
				decorationRange,
				sourceNodeMetaData,
			}
			hoverObjects.push(hoverObject)
		}
		if (this.sensorValueHoverProvider) {
			this.sensorValueHoverProvider.dispose()
		}

		const language = filePathRelativeToWorkspace.toString().slice(-3) === '.ts' ? 'typescript' : 'javascript'
		this.sensorValueHoverProvider = vscode.languages.registerHoverProvider(
			{ scheme: 'file', language },
			new SensorValueHoverProvider(hoverObjects, this._sensorValueRepresentation)
		)
	}

	setEditor(editor: TextEditor) {
		this.editor = editor
		this.refresh()
	}
}
