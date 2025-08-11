import { ProjectReport, UnifiedPath } from '@oaklean/profiler-core'
import vscode from 'vscode'

export class ProjectReportDocument
	extends vscode.Disposable
	implements vscode.CustomDocument {
	private readonly _onDidChange = new vscode.EventEmitter<{
		readonly content?: ProjectReport
		readonly editable?: boolean
	}>()
	public readonly onDidChange = this._onDidChange.event

	constructor(
		public readonly uri: vscode.Uri,
		public readonly reportPath: UnifiedPath,
		private _content: ProjectReport
	) {
		super(() => this.dispose())
	}

	get content(): ProjectReport {
		return this._content
	}

	update(newContent: ProjectReport) {
		this._content = newContent
		this._onDidChange.fire({ content: newContent })
	}

	dispose(): void {
		this._onDidChange.dispose()
	}
}
