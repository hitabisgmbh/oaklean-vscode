import vscode from 'vscode'

import { getNonce } from '../utilities/getNonce'
import { getUri } from '../utilities/getUri'
import { Container } from '../container'
import {
	EditorFileMethodReferenceViewProtocolCommands,
	EditorFileMethodReferenceViewProtocol_ChildToParent,
	EditorFileMethodReferenceViewProtocol_ParentToChild
} from '../protocols/EditorFileMethodReferenceViewProtocol'
import {
	TextEditorChangeEvent,
	TextEditorsChangeVisibilityEvent
} from '../helper/EventHandler'
import path from 'path'

export class EditorFileMethodReferenceViewProvider
	implements vscode.WebviewViewProvider {
	private subscriptions: vscode.Disposable[] = []

	public static readonly viewType = 'editorFileMethodReferenceView'
	private _view?: vscode.WebviewView
	_container: Container
	editor: vscode.TextEditor | undefined
	constructor(
		private readonly _extensionUri: vscode.Uri,
		container: Container
	) {
		this._container = container
		// In dev, refresh the view when webpack recompiles the webview bundle
		this.subscriptions = [this._container.eventHandler.onWebpackRecompile(
			this.hardRefresh.bind(this)
		), this._container.eventHandler.onTextEditorChange(
			this.textEditorChanged.bind(this)
		), this._container.eventHandler.onTextEditorsChangeVisibility(
			this.onTextEditorsChangeVisibility.bind(this)
		)]
	}

	dispose() {
		this.subscriptions.forEach((d) => d.dispose())
		this.subscriptions = []
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView
		this.subscriptions.push(
			this._view.onDidChangeVisibility(this.hardRefresh.bind(this)),
			this._view.webview.onDidReceiveMessage(
				this.receiveMessageFromWebview.bind(this)
			)
		)

		webviewView.webview.options = {
			// Enable scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				// Allow the webview to access resources in the workspace
				this._extensionUri
			]
		}

		webviewView.webview.html = this._getHtmlForWebview(
			webviewView.webview,
			this._extensionUri
		)
		this.editor = vscode.window.activeTextEditor
		this.sendFileName()
	}

	receiveMessageFromWebview(
		message: EditorFileMethodReferenceViewProtocol_ChildToParent
	) {
		if (message.command === EditorFileMethodReferenceViewProtocolCommands.closeActiveFile) {
			void this.closeActiveFile()
		} else if (message.command === EditorFileMethodReferenceViewProtocolCommands.requestFileName) {
			this.sendFileName()
		}
	}

	hardRefresh() {
		if (this._view === undefined) {
			return
		}
		// Rebuild the HTML so the webview picks up the latest assets
		this._view.webview.html = this._getHtmlForWebview(
			this._view.webview,
			this._extensionUri
		)
		this.sendFileName()
	}

	// When the active text editor changes, track it and push the new name
	textEditorChanged(event: TextEditorChangeEvent) {
		this.editor = event.editor
		this.sendFileName()
	}

	// When visible editors change (e.g., last editor closed), update tracking and name
	onTextEditorsChangeVisibility(event: TextEditorsChangeVisibilityEvent) {
		if (event.editors.length === 0) {
			this.editor = undefined
		} else {
			this.editor = vscode.window.activeTextEditor
		}
		this.sendFileName()
	}

	private sendFileName() {
		// If the webview isn't ready, there's nowhere to send the update
		if (this._view === undefined) {
			return
		}
		// Use the active editor's file name , or empty string when none
		const fileName =
			this.editor?.document?.fileName !== undefined
				? path.basename(this.editor.document.fileName)
				: ''

		// Build the protocol message and post it to the webview
		const message: EditorFileMethodReferenceViewProtocol_ParentToChild = {
			command: EditorFileMethodReferenceViewProtocolCommands.updateFileName,
			fileName 
		}
		this._view.webview.postMessage(message)
	}

	// Closes the currently active editor tab
	private async closeActiveFile() {
		try {
			
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
		} catch (error) {
			console.error('Failed to close active editor file from reference view', error)
		}
	}

	private _getHtmlForWebview(
		webview: vscode.Webview,
		extensionUri: vscode.Uri
	) {
		// Use a nonce to only allow specific scripts to be run
		const nonce = getNonce()
		const webviewUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'EditorFileMethodReferenceView.js'
		])
		const stylesUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'EditorFileMethodReferenceView.css'
		])
		const vendorsUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'vendors.js'
		])
		const codiconsUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'codicons',
			'codicon.css'
		])

		const mediaPath = getUri(webview, extensionUri, ['media'])

		const htmlContent = `<!DOCTYPE html>
        <html lang="en">
          <head>
						<meta charset="UTF-8">
						<meta name="viewport" content="width=device-width,initial-scale=1.0">
						<meta
							http-equiv="Content-Security-Policy"
							content="
								default-src 'none';
								font-src ${webview.cspSource};
								img-src ${webview.cspSource};
								style-src 'unsafe-inline' ${webview.cspSource};
								style-src-elem 'unsafe-inline' ${webview.cspSource};
								script-src 'nonce-${nonce}';
							"
						>
						<link rel="stylesheet" href="${stylesUri}">
						<link rel="stylesheet" href="${codiconsUri}">
            <title>Files Methods</title>
						<script nonce="${nonce}">
							window.__MEDIA_PATH__ = "${mediaPath}";
						</script>
          </head>
          <body>
						<div id="root"></div>
						<script nonce="${nonce}" src="${vendorsUri}"></script>
						<script nonce="${nonce}" src="${webviewUri}"></script>
          </body>
        </html>
    `

		return htmlContent
	}
}
