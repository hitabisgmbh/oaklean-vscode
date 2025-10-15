import vscode, { Disposable, TextEditor } from 'vscode'

import { Container } from '../container'
import {
	ReportLoadedEvent,
	TextEditorChangeEvent,
	SelectedSensorValueRepresentationChangeEvent,
	ToggleLineAnnotationsChangeEvent,
	SourceFileInformationChangeEvent
} from '../helper/EventHandler'
import { CodeHighlightingProvider } from '../decorations/CodeHighlightingProvider'


export default class TextEditorController implements Disposable {
	private readonly _disposable: Disposable
	container: Container
	editor: TextEditor | undefined
	private codeHighlightingProvider: CodeHighlightingProvider | undefined

	constructor(container: Container) {
		this.container = container
		this._disposable = Disposable.from(
			(this.codeHighlightingProvider = new CodeHighlightingProvider(container)),
			this.container.eventHandler.onTextEditorChange(
				this.textEditorChanged.bind(this)
			),
			this.container.eventHandler.onSourceFileInformationChange(
				this.sourceFileInformationChanged.bind(this)
			),
			this.container.eventHandler.onReportLoaded(this.reportLoaded.bind(this)),
			this.container.eventHandler.onSelectedSensorValueTypeChange(
				this.selectedSensorValueTypeChanged.bind(this)
			),
			this.container.eventHandler.onToggleLineAnnotationsChange(
				this.toggleLineAnnotationsChange.bind(this)
			),
			vscode.window.onDidChangeActiveColorTheme(() => {
				this.refresh()
			})
		)
	}

	toggleLineAnnotationsChange(event: ToggleLineAnnotationsChangeEvent) {
		this.refresh()
	}

	selectedSensorValueTypeChanged(
		event: SelectedSensorValueRepresentationChangeEvent
	) {
		this.refresh()
	}

	reportLoaded(event: ReportLoadedEvent) {
		this.refresh()
	}

	textEditorChanged(event: TextEditorChangeEvent) {
		this.setEditor(event.editor)
	}

	sourceFileInformationChanged(event: SourceFileInformationChangeEvent) {
		if (this.editor === undefined) {
			return
		}
		if (this.editor.document.fileName === event.absolutePath.toString()) {
			this.refresh()
		}
	}

	dispose() {
		this._disposable.dispose()
	}

	refresh() {
		if (this.editor === undefined) {
			return
		}
		this.codeHighlightingProvider?.provideDecorations(this.editor)
	}

	setEditor(editor: TextEditor) {
		this.editor = editor
		this.refresh()
	}
}
