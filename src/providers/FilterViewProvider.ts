import * as vscode from 'vscode'

import {getNonce} from '../utilities/getNonce'
import { getUri } from '../utilities/getUri'
import { Container } from '../container'
import FilterCommand from '../commands/FilterCommand'
import {FilterViewCommands} from '../types/filterViewCommands'
import {FilterViewProtocol_ChildToParent} from '../protocols/filterViewProtocol'

export class FilterViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'filterView'

	private _view?: vscode.WebviewView
	_container: Container
	constructor(private readonly _extensionUri: vscode.Uri, container: Container) {
		this._container = container
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView
		const filterCommand: FilterCommand  = this._container.filterCommand
		let includedFilterPath = this._container.storage.getWorkspace('includedFilterPath') as string || ''
		let excludedFilterPath = this._container.storage.getWorkspace('excludedFilterPath') as string || ''

		this._view.webview.onDidReceiveMessage(
			(message: FilterViewProtocol_ChildToParent) => {
				if (message.command === FilterViewCommands.includedPathChange){
					this._container.storage.storeWorkspace('includedFilterPath', message.text)
					includedFilterPath = message.text
					filterCommand.filter(message.command, message.text)
				} else if (message.command === FilterViewCommands.excludedPathChange) {
					this._container.storage.storeWorkspace('excludedFilterPath', message.text)
					excludedFilterPath = message.text
					filterCommand.filter(message.command, message.text)
				}
			}
		)

		this._view.onDidChangeVisibility(() => {
			webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, 
				this._extensionUri, includedFilterPath, excludedFilterPath)
			
		})
		webviewView.webview.options = {
			// Enable scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				// Allow the webview to access resources in the workspace
				this._extensionUri
			]
		}

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview, 
			this._extensionUri, includedFilterPath, excludedFilterPath)
	}

	private _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri, 
		includedFilterPath?: string, excludedFilterPath?: string) {
		// Use a nonce to only allow specific scripts to be run
		const nonce = getNonce()
		const webviewUri = getUri(webview, extensionUri, ['dist', 'webview', 'FilterView.js'])
		const stylesUri = getUri(webview, extensionUri, ['dist', 'webview', 'filterView.css'])
		const htmlContent = `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1.0">
						<meta http-equiv="Content-Security-Policy"
						content="default-src 'none'; 
						style-src ${webview.cspSource} 'unsafe-inline';
						script-src 'nonce-${nonce}';">
						<link rel="stylesheet" href="${stylesUri}">
            <title>Filter</title>
          </head>
          <body>
          <vscode-input-box placeholder="Add path..."></vscode-input-box>
          <vscode-text-field id="includePath" class="include-exclude-field" 
		  placeholder="e.g. *.ts, src/**/include" value="${includedFilterPath}">Included files path</vscode-text-field>
		  <vscode-text-field id="excludePath" class="include-exclude-field" 
		  placeholder="e.g. *.ts, src/**/exclude" value="${excludedFilterPath}">Excluded files path</vscode-text-field>
          <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
          </body>
        </html>
    `
	
		return htmlContent
	}
}

