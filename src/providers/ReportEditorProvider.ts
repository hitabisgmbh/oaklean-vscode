import vscode, {
	CustomEditorProvider,
	CustomDocumentContentChangeEvent
} from 'vscode'
import { ProjectReport, UnifiedPath } from '@oaklean/profiler-core'

import { getUri } from '../utilities/getUri'
import { getNonce } from '../utilities/getNonce'
import { Container } from '../container'
import { ProjectReportHelper } from '../helper/ProjectReportHelper'
import { ProjectReportDocument } from '../customDocuments/ProjectReportDocument'
import {
	ReportViewProtocol_ChildToParent,
	ReportViewProtocolCommands
} from '../protocols/ReportViewProtocol'

export class ReportEditorProvider implements CustomEditorProvider {
	private _contentMap: Map<string, ProjectReportDocument>
	private subscriptions: vscode.Disposable[] = []

	private onDidChangeCustomDocumentEmitter =
		new vscode.EventEmitter<CustomDocumentContentChangeEvent>()
	public static readonly viewType = 'oaklean.oak'

	_container: Container
	constructor(container: Container) {
		this._container = container
		this._contentMap = new Map<string, ProjectReportDocument>()

		this.subscriptions.push(
			vscode.workspace.registerTextDocumentContentProvider('readonly', {
				provideTextDocumentContent: (uri: vscode.Uri) => {
					const document = this._contentMap.get(uri.fsPath)
					if (document) {
						return JSON.stringify(document.content, null, 2)
					} else {
						return ''
					}
				}
			})
		)
	}

	dispose() {
		this.subscriptions.forEach((sub) => sub.dispose())
	}

	async resolveCustomEditor(
		document: ProjectReportDocument,
		webviewPanel: vscode.WebviewPanel
	): Promise<void> {
		webviewPanel.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				vscode.Uri.joinPath(
					this._container.context.extensionUri,
					'dist',
					'webview'
				)
			]
		}
		webviewPanel.webview.html = this._getHtmlForWebview(
			document.content,
			webviewPanel.webview,
			this._container.context.extensionUri,
			document.reportPath.toPlatformString()
		)

		webviewPanel.webview.onDidReceiveMessage(
			this.receiveMessageFromWebview(document)
		)
	}

	async openCustomDocument(
		uri: vscode.Uri,
		openContext: { backupId?: string },
		token: vscode.CancellationToken
	): Promise<ProjectReportDocument> {
		// Handle cancellation before doing heavy work
		if (token.isCancellationRequested) {
			throw new Error('Document opening was cancelled')
		}

		const reportPath = new UnifiedPath(uri.fsPath)
		const readPromise = new Promise<ProjectReport>((resolve, reject) => {
			const report = ProjectReportHelper.loadReport(reportPath)
			if (report === null) {
				reject(null)
			} else {
				resolve(report)
			}
		})
		const fileData = await Promise.race([
			readPromise,
			new Promise<never>((_, reject) =>
				token.onCancellationRequested(() =>
					reject(new Error('Opening cancelled'))
				)
			)
		])
		const document = new ProjectReportDocument(uri, reportPath, fileData)
		this._contentMap.set(uri.fsPath, document)
		return document
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
		context: vscode.CustomDocumentBackupContext
	): Promise<vscode.CustomDocumentBackup> {
		return {
			id: context.destination.toString(),
			delete: async () => {
				// Delete the backup data if needed
			}
		}
	}

	onDidChangeCustomDocument(
		listener: (e: CustomDocumentContentChangeEvent) => any,
		thisArgs?: any,
		disposables?: vscode.Disposable[]
	): vscode.Disposable {
		const disposable = this.onDidChangeCustomDocumentEmitter.event(
			listener,
			thisArgs,
			disposables
		)
		this.subscriptions.push(disposable)
		return disposable
	}

	receiveMessageFromWebview(document: ProjectReportDocument) {
		return (message: ReportViewProtocol_ChildToParent) => {
			switch (message.command) {
			case ReportViewProtocolCommands.openAsJson:
				this.openJsonEditor(document)
				break
		}
		}
	}

	async openJsonEditor(
		document: ProjectReportDocument
	): Promise<void> {
		try {
			vscode.window.showInformationMessage('Opening JSON editor...')
			const readOnlyUri = document.uri.with({ scheme: 'readonly' })
			const doc = await vscode.workspace.openTextDocument(readOnlyUri)
			await vscode.languages.setTextDocumentLanguage(doc, 'json')
			await vscode.window.showTextDocument(doc, { preview: true })
		} catch (error) {
			console.error('Error opening JSON editor:', error)
			vscode.window.showErrorMessage(`Failed to open JSON editor: ${error}`)
		}
	}

	_getHtmlForWebview(
		data: ProjectReport,
		webview: vscode.Webview,
		extensionUri: vscode.Uri,
		filePath: string
	): string {
		const nonce = getNonce()
		const webviewUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'ReportWebview.js'
		])
		const vendorsUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'vendors.js'
		])
		const styleUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'stylesReportPage.css'
		])

		const dateOptions = {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false
		}

		const commitHash = data.executionDetails.commitHash
		const timestamp = data.executionDetails.timestamp
		const timestampDate = new Date(timestamp)
		const commitTimestamp = data.executionDetails.commitTimestamp
		const formattedTimestamp = timestampDate.toLocaleString(
			undefined,
			dateOptions as Intl.DateTimeFormatOptions
		)
		let formattedCommitTimestamp = ''
		if (commitTimestamp !== undefined) {
			const commitTimestampDate = new Date(commitTimestamp * 1000)
			formattedCommitTimestamp = commitTimestampDate.toLocaleString(
				undefined,
				dateOptions as Intl.DateTimeFormatOptions
			)
		}
		const version = data.reportVersion
		const projectId = data.projectMetaData.projectID
		const uncommittedChanges = data.executionDetails.uncommittedChanges
		const nodeVersion = data.executionDetails.languageInformation.version
		const origin = data.executionDetails.origin
		const os =
			data.executionDetails.systemInformation.os.platform +
			', ' +
			data.executionDetails.systemInformation.os.distro +
			', ' +
			data.executionDetails.systemInformation.os.release +
			', ' +
			data.executionDetails.systemInformation.os.arch
		const runtime = data.executionDetails.runTimeOptions.v8.cpu.sampleInterval
		const sensorInterface =
			data.executionDetails.runTimeOptions.sensorInterface === undefined
				? 'None'
				: data.executionDetails.runTimeOptions.sensorInterface?.type +
				' (type) , ' +
				data.executionDetails.runTimeOptions.sensorInterface?.options
						.sampleInterval +
				' (sampleInterval)'

		return /*HTML*/ `
					<!DOCTYPE html>
					<html lang="en">
					<head>
							<meta charset="UTF-8">
							<meta name="viewport" content="width=device-width,initial-scale=1.0">
							<meta http-equiv="Content-Security-Policy" 
							content="default-src 'none'; script-src 'nonce-${nonce}';style-src ${
			webview.cspSource
		} 'unsafe-inline';">
							<link rel="stylesheet" href="${styleUri}">
					</head>
					<body>
				<div class="container">
					<div class="sidebar">
						<h2>Options</h2>
						<vscode-button
							id="jsonButton"
							appearance="primary"
							title="This button will open the original JSON"
						>
						JSON</vscode-button>
						<input type="hidden" id="filePath" value="${filePath}">
					</div>
					<div class="info-table">
					<p>This is an overview of the report data.</p>
						<table>
							<tr><td>Project Name</td><td>${filePath.split(/[/\\\\]/).pop()}</td></tr>
							<tr><td>CommitHash</td><td>${commitHash}</td></tr>
							<tr><td>Commit Date</td><td>${formattedCommitTimestamp}</td></tr>
							<tr><td>Time of Measurement</td><td>${formattedTimestamp}</td></tr>
							<tr><td>Version</td><td>${version}</td></tr>
							<tr><td>ProjectID</td><td>${projectId}</td></tr>
							<tr><td>Uncommitted Changes</td><td>${uncommittedChanges}</td></tr>
							<tr><td>Node Version</td><td>${nodeVersion}</td></tr>
							<tr><td>Origin</td><td>${origin}</td></tr>
							<tr><td>OS</td><td>${os}</td></tr>
							<tr><td>V8 CPU Sample Interval</td><td>${runtime}</td></tr>
							<tr><td>SensorInterface</td><td>${sensorInterface}</td></tr>
						</table>
					</div>
				</div>
				<script nonce="${nonce}" src="${vendorsUri}"></script>
				<script type="module" nonce="${nonce}" src="${webviewUri}"></script>
					</body>
					</html>
			`
	}
}
