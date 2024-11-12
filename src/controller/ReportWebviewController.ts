import vscode, { Disposable } from 'vscode'
import { ProjectReport, UnifiedPath } from '@oaklean/profiler-core'

import { Container } from '../container'
import WorkspaceUtils from '../helper/WorkspaceUtils'

export class ReportWebviewController implements Disposable {
	private container: Container
	private readonly _disposable: Disposable


	constructor(container: Container) {
		this.container = container
		this._disposable = vscode.Disposable.from(
		)
	}

	public static async openJsonEditor(filePath: string): Promise<void> {
		try {
			vscode.window.showInformationMessage('Opening JSON editor...')
			const inputPath = new UnifiedPath(filePath)
			const report = ProjectReport.loadFromFile(inputPath, 'bin', WorkspaceUtils.getWorkspaceProfilerConfig())
			if (report === undefined) {
				vscode.window.showErrorMessage(`Could not find a profiler report at ${inputPath.toPlatformString()}`)
				return
			}
			const formattedJson = JSON.stringify(report, null, 2)
			const provider = {
				provideTextDocumentContent: () => formattedJson,
			}
			vscode.workspace.registerTextDocumentContentProvider('readonly', provider)

			const fileUri = vscode.Uri.file(filePath)
			const readOnlyUri = fileUri.with({ scheme: 'readonly' })
			const doc = await vscode.workspace.openTextDocument(readOnlyUri)
			await vscode.window.showTextDocument(doc, { preview: true })

			vscode.languages.setTextDocumentLanguage(doc, 'json')
		} catch (error) {
			console.error('Error opening JSON editor:', error)
			vscode.window.showErrorMessage(`Failed to open JSON editor: ${error}`)
		}
	}


	public dispose() {
		this._disposable.dispose()
	}
}
