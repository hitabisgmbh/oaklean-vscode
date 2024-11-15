import vscode, { CustomEditorProvider, ExtensionContext, CustomDocumentContentChangeEvent } from 'vscode'
import { UnifiedPath } from '@oaklean/profiler-core'

import { Container } from '../container'
import { ReportWebviewPanel } from '../panels/ReportWebviewPanel'
import WorkspaceUtils from '../helper/WorkspaceUtils'
import { ProjectReportHelper } from '../helper/ProjectReportHelper'

export class ReportEditorProvider implements CustomEditorProvider {
	private onDidChangeCustomDocumentEmitter = new vscode.EventEmitter<CustomDocumentContentChangeEvent>()
	public static readonly viewType = 'oaklean.oak'

	private _view?: vscode.WebviewView
	_container: Container
	constructor(container: Container) {
		this._container = container
	}

	public static register(context: ExtensionContext, container: Container): void {
		const provider = new ReportEditorProvider(container)
		const registration = vscode.window.registerCustomEditorProvider(
			'oaklean.oak', provider)
		context.subscriptions.push(registration)
	}

	async resolveCustomEditor(document: vscode.CustomDocument): Promise<void> {
		const reportPath = new UnifiedPath(document.uri.fsPath)
		const report = ProjectReportHelper.loadReport(reportPath)
		if (report === null) {
			return
		}
		await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
		ReportWebviewPanel.render(this._container, report, reportPath.toPlatformString())
	}


	async openCustomDocument(uri: vscode.Uri): Promise<vscode.CustomDocument> {
		return {
			uri, dispose: () => {
				// no-op
			}
		} as vscode.CustomDocument
	}

	saveCustomDocument(): Thenable<void> {
		throw new Error('Method')
	}

	saveCustomDocumentAs(): Thenable<void> {
		throw new Error('Method not ')
	}

	revertCustomDocument(): Thenable<void> {
		throw new Error('Method not implemented.')
	}

	async backupCustomDocument(
		document: vscode.CustomDocument,
		context: vscode.CustomDocumentBackupContext,
	): Promise<vscode.CustomDocumentBackup> {
		return {
			id: context.destination.toString(),
			delete: async () => {
				// Delete the backup data if needed
			},
		}
	}

	private subscriptions: vscode.Disposable[] = []

	onDidChangeCustomDocument(listener: (e: CustomDocumentContentChangeEvent) => any, thisArgs?: any,
		disposables?: vscode.Disposable[]): vscode.Disposable {
		const disposable = this.onDidChangeCustomDocumentEmitter.event(listener, thisArgs, disposables)
		this.subscriptions.push(disposable)
		return disposable
	}

	dispose() {
		this.subscriptions.forEach(sub => sub.dispose())
		this.subscriptions = []
	}
}
