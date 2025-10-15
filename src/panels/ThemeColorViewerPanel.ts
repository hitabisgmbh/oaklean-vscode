import vscode from 'vscode'

import { getNonce } from '../utilities/getNonce'
import { getUri } from '../utilities/getUri'
import { Container } from '../container'

type IColorData = {
	key: string
	description: string
}

export class ThemeColorViewerPanel {
	public static currentPanel: ThemeColorViewerPanel | undefined
	private readonly _panel: vscode.WebviewPanel
	private subscriptions: vscode.Disposable[] = []
	private static cachedColors: IColorData[] | undefined

	_container: Container
	constructor(
		private readonly _extensionUri: vscode.Uri,
		container: Container
	) {
		this._container = container
		this.subscriptions.push(
			this._panel = vscode.window.createWebviewPanel('ThemeColorViewer', 'ThemeColorViewer', vscode.ViewColumn.Beside, {
				enableScripts: true,
				// Restrict the webview to only load resources from the `dist` directory
				localResourceRoots: [this._extensionUri],
				retainContextWhenHidden: true
			}),
			this._panel.onDidDispose(() => this.dispose()),
			this._container.eventHandler.onWebpackRecompile(this.hardRefresh.bind(this))
		)
		this._panel.webview.options = {
			enableScripts: true,

			localResourceRoots: [
				this._container.context.extensionUri
			]
		}
		this.hardRefresh()
	}

	hardRefresh() {
		if (this._panel === undefined) {
			return
		}
		this._panel.webview.html = this._getHtmlForWebview(
			this._panel.webview,
			this._extensionUri
		)
	}

	static async retrieveColorItems() {
    ThemeColorViewerPanel.cachedColors ??= await (async () => {
      try {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse('vscode://schemas/workbench-colors'))
        const contents = JSON.parse(doc.getText())

        return Object.entries(contents.properties).map(([key, value]) => ({
          description: (value as { description: string }).description,
          key: key.replace(/\./g, '-'),
        }))
      } catch (e) {
        console.error('error fetching updated vscode theme colors:', e)
        return []
      }
    })()

    return ThemeColorViewerPanel.cachedColors
  }


	public static async render(container: Container) {
		await ThemeColorViewerPanel.retrieveColorItems()
		if (ThemeColorViewerPanel.currentPanel) {
			ThemeColorViewerPanel.currentPanel._panel.reveal()
		} else {
			ThemeColorViewerPanel.currentPanel = new ThemeColorViewerPanel(
				container.context.extensionUri,
				container
			)

		}
		return ThemeColorViewerPanel.currentPanel
	}

	dispose() {
		ThemeColorViewerPanel.currentPanel = undefined
		this.subscriptions.forEach((d) => d.dispose())
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
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
			'ThemeColorViewer.js'
		])
		const vendorsUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'vendors.js'
		])
		const htmlContent = `<!DOCTYPE html>
				<html lang="en">
					<head>
						<meta charset="UTF-8">
						<meta name="viewport" content="width=device-width,initial-scale=1.0">
						<meta http-equiv="Content-Security-Policy"
							content="
								default-src 'none'; 
								style-src ${webview.cspSource} 'unsafe-inline';
								script-src 'nonce-${nonce}';"
						>
						<script nonce="${nonce}">
							window.__THEME_COLORS__ =
								${JSON.stringify(ThemeColorViewerPanel.cachedColors || [])};
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
