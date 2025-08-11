import vscode, {
	CustomEditorProvider,
	CustomDocumentContentChangeEvent
} from 'vscode'
import { ProjectReport, UnifiedPath } from '@oaklean/profiler-core'

import { getUri } from '../utilities/getUri'
import { getNonce } from '../utilities/getNonce'
import { Container } from '../container'
import { ProjectReportHelper } from '../helper/ProjectReportHelper'
import { ProjectReportDocument } from '../CustomDocuments/ProjectReportDocument'
import {
	ReportViewProtocol_ChildToParent,
	ReportViewProtocol_ParentToChild,
	ReportViewProtocolCommands
} from '../protocols/ReportViewProtocol'

const VIEW_TYPE = 'ReportEditorProvider'
export class ReportEditorProvider implements CustomEditorProvider {
	private _contentMap: Map<string, ProjectReportDocument>
	private subscriptions: vscode.Disposable[] = []

	private onDidChangeCustomDocumentEmitter =
		new vscode.EventEmitter<CustomDocumentContentChangeEvent>()
	public static readonly viewType = VIEW_TYPE

	_container: Container
	constructor(container: Container) {
		this._container = container
		this._contentMap = new Map<string, ProjectReportDocument>()
	}

	dispose() {
		this.subscriptions.forEach((sub) => sub.dispose())
	}

	register() {
		return vscode.window.registerCustomEditorProvider(VIEW_TYPE, this, {
			webviewOptions: {
				retainContextWhenHidden: true
			},
			supportsMultipleEditorsPerDocument: false
		})
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
		this.hardRefresh(webviewPanel, document)
		this.subscriptions.push(
			webviewPanel.webview.onDidReceiveMessage(
				this.receiveMessageFromWebview(webviewPanel.webview, document).bind(
					this
				)
			),
			this._container.eventHandler.onWebpackRecompile(
				this.hardRefresh.bind(this, webviewPanel, document)
			)
		)
	}

	hardRefresh(
		webviewPanel: vscode.WebviewPanel,
		document: ProjectReportDocument
	): void {
		webviewPanel.webview.html = this._getHtmlForWebview(
			document.content,
			webviewPanel.webview,
			this._container.context.extensionUri,
			document.reportPath.toPlatformString()
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
		throw new Error('ReportEditorProvider.saveCustomDocument: not implemented.')
	}

	saveCustomDocumentAs(): Thenable<void> {
		throw new Error(
			'ReportEditorProvider.saveCustomDocumentAs: not implemented.'
		)
	}

	revertCustomDocument(): Thenable<void> {
		throw new Error(
			'ReportEditorProvider.revertCustomDocument: not implemented.'
		)
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

	postMessageToWebview(
		webview: vscode.Webview,
		message: ReportViewProtocol_ParentToChild
	): void {
		webview.postMessage(message)
	}

	receiveMessageFromWebview(
		webview: vscode.Webview,
		document: ProjectReportDocument
	) {
		return (message: ReportViewProtocol_ChildToParent) => {
			switch (message.command) {
				case ReportViewProtocolCommands.openAsJson:
					this.openJsonEditor(document)
					break
				case ReportViewProtocolCommands.viewLoaded:
					this.setReportData(webview, document)
					break
			}
		}
	}

	setReportData(webview: vscode.Webview, document: ProjectReportDocument) {
		const dateOptions = {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false
		}
		const report = document.content
		const fileName = document.reportPath.basename()

		const commitHash = report.executionDetails.commitHash
		const timestamp = report.executionDetails.timestamp
		const timestampDate = new Date(timestamp)
		const commitTimestamp = report.executionDetails.commitTimestamp
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
		const version = report.reportVersion
		const projectId = report.projectMetaData.projectID
		const uncommittedChanges = report.executionDetails.uncommittedChanges
		const nodeVersion = report.executionDetails.languageInformation.version
		const origin = report.executionDetails.origin
		const systemInformation = report.executionDetails.systemInformation

		const runtime = report.executionDetails.runTimeOptions.v8.cpu.sampleInterval
		const sensorInterface =
			report.executionDetails.runTimeOptions.sensorInterface

		this.postMessageToWebview(webview, {
			command: ReportViewProtocolCommands.setReportData,
			data: {
				fileName,
				commitHash,
				formattedCommitTimestamp,
				formattedTimestamp,
				version,
				projectId,
				uncommittedChanges,
				nodeVersion,
				origin,
				os: {
					platform: systemInformation.os.platform,
					distro: systemInformation.os.distro,
					release: systemInformation.os.release,
					arch: systemInformation.os.arch
				},
				runtime,
				sensorInterface: sensorInterface
					? {
							type: sensorInterface.type,
							sampleInterval: sensorInterface.options.sampleInterval
					}
					: undefined
			}
		})
	}

	async openJsonEditor(document: ProjectReportDocument): Promise<void> {
		try {
			vscode.window.showInformationMessage('Opening JSON editor...')
			this._container.jsonTextDocumentContentProvider.openFileJsonReadonly(
				document.uri,
				JSON.stringify(document.content, null, 2)
			)
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
			'ReportEditorView.js'
		])
		const styleUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'ReportEditorView.css'
		])
		const vendorsUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'vendors.js'
		])

		return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width,initial-scale=1.0">
					<meta http-equiv="Content-Security-Policy" content="
						default-src 'none';
						script-src 'nonce-${nonce}';
						style-src ${webview.cspSource} 'unsafe-inline';
					">
					<link rel="stylesheet" href="${styleUri}">
			</head>
			<body>
				<div id="root"></div>
				<script nonce="${nonce}" src="${vendorsUri}"></script>
				<script nonce="${nonce}" src="${webviewUri}"></script>
			</body>
			</html>
		`
	}
}
