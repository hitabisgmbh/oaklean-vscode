import path from 'path'

import * as vscode from 'vscode'
import { ProjectReport } from '@oaklean/profiler-core'

import { getUri } from '../utilities/getUri'
import { getNonce } from '../utilities/getNonce'
import { Container } from '../container'
import { ReportWebViewProtocol_ChildToParent } from '../protocols/reportWebviewProtocol'
import { ReportWebviewController } from '../controller/ReportWebviewController'




export class ReportWebviewPanel {
	private static currentPanel: ReportWebviewPanel | undefined
	private _panel: vscode.WebviewPanel | undefined
	private _disposables: vscode.Disposable[] = []
	private container: Container
	private fileName: string
	private static panels: Map<string, ReportWebviewPanel> = new Map()

	constructor(container: Container, document: ProjectReport, filePath: string) {
		this.container = container
		this.fileName = path.basename(filePath)

		this._panel = vscode.window.createWebviewPanel(
			'Report',
			this.fileName,
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(this.container.context.extensionUri, 'dist', 'webview')],
				retainContextWhenHidden: true
			}
		)
		this._panel.webview.html = this._getWebviewContent(
			document,
			this._panel.webview,
			this.container.context.extensionUri,
			filePath
		)
		this._panel.webview.onDidReceiveMessage(
			(message: ReportWebViewProtocol_ChildToParent) => {
				switch (message.command) {
					case 'openFile':
						ReportWebviewController.openJsonEditor(message.filePath)
						break
				}
			}
		)
		this._panel.onDidDispose(() => this.dispose(filePath))
	}


	private _getWebviewContent(data: ProjectReport, webview: vscode.Webview,
		extensionUri: vscode.Uri, filePath: string): string {
		const nonce = getNonce()
		const webviewUri = getUri(webview, extensionUri, ['dist', 'webview', 'ReportWebview.js'])
		const styleUri = getUri(webview, extensionUri, ['dist', 'webview', 'stylesReportPage.css'])

		const dateOptions = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }

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
		const os = data.executionDetails.systemInformation.os.platform + ', ' +
			data.executionDetails.systemInformation.os.distro + ', ' +
			data.executionDetails.systemInformation.os.release + ', ' +
			data.executionDetails.systemInformation.os.arch
		const runtime = data.executionDetails.runTimeOptions.v8.cpu.sampleInterval
		const sensorInterface = data.executionDetails.runTimeOptions.sensorInterface === undefined ? 'None' : data.executionDetails.runTimeOptions.sensorInterface?.type + ' (type) , ' +
			data.executionDetails.runTimeOptions.sensorInterface?.options.sampleInterval + ' (sampleInterval)'


		return /*HTML*/ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" 
            content="default-src 'none'; script-src 'nonce-${nonce}';style-src ${webview.cspSource} 'unsafe-inline';">
            <link rel="stylesheet" href="${styleUri}">
        </head>
        <body>
			<div class="container">
				<div class="sidebar">
					<h2>Options</h2>
					<vscode-button id="jsonButton" appearance="primary" title="This button will open the original JSON">
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
			<script type="module" nonce="${nonce}" src="${webviewUri}"></script>
        </body>
        </html>
    `
	}

	public postMessageToWebview(message: ReportWebViewProtocol_ChildToParent) {
		if (this._panel) {
			this._panel.webview.postMessage(message)
		}
	}

	public static render(container: Container, data: ProjectReport, filePath: string) {
		if (ReportWebviewPanel.panels.has(filePath)) {
			const panel = ReportWebviewPanel.panels.get(filePath)
			if (panel?._panel) {
				panel._panel.reveal()
				panel.updateContent(data, filePath)
				return panel
			}
		}

		const panel = new ReportWebviewPanel(container, data, filePath)
		ReportWebviewPanel.panels.set(filePath, panel)
		return panel
	}

	public updateContent(document: ProjectReport, filePath: string) {
		if (this._panel) {
			this._panel.webview.html = this._getWebviewContent(
				document,
				this._panel.webview,
				this.container.context.extensionUri,
				filePath
			)
		}
	}

	public dispose(filePath: string) {
		ReportWebviewPanel.currentPanel = undefined
		ReportWebviewPanel.panels.delete(filePath)

		if (this._panel !== undefined) {
			this._panel.dispose()
		}

		while (this._disposables.length) {
			const disposable = this._disposables.pop()
			if (disposable) {
				disposable.dispose()
			}
		}
	}

}
