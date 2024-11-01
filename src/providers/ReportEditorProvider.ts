import vscode, { CustomEditorProvider, ExtensionContext, CustomDocumentContentChangeEvent } from 'vscode'
import { ProfilerConfig, ProjectReport, UnifiedPath } from '@oaklean/profiler-core'

import { Container } from '../container'
import { ReportWebviewPanel } from '../panels/ReportWebviewPanel'
import WorkspaceUtils from '../helper/WorkspaceUtils'

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
		const inputPath = new UnifiedPath(document.uri.fsPath)
		const config = ProfilerConfig.autoResolveFromPath(inputPath.dirName())
		const report = ProjectReport.loadFromFile(inputPath, 'bin', config)
		if (report === undefined) {
			console.error(`Could not find a profiler report at ${inputPath.toPlatformString()}`)
			throw new Error(`Could not find a profiler report at ${inputPath.toPlatformString()}`)
		} else {
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
			ReportWebviewPanel.render(this._container, report, inputPath.toPlatformString())
		}
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
