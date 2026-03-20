import vscode from 'vscode'

import { getNonce } from '../../utilities/getNonce'
import { getUri } from '../../utilities/getUri'

export function getEditorFileMethodReferenceViewHtml(
	webview: vscode.Webview,
	extensionUri: vscode.Uri
): string {
	// Build secure webview HTML with strict CSP and explicit asset URIs.
	const nonce = getNonce()
	// Entry script and stylesheet emitted by webpack for this specific view.
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
	// Codicon font/css is copied to dist during webview webpack build.
	const codiconsUri = getUri(webview, extensionUri, [
		'dist',
		'webview',
		'codicons',
		'codicon.css'
	])

	// Expose media base path to the webview runtime for icon/image components.
	const mediaPath = getUri(webview, extensionUri, ['media'])

	// CSP strategy:
	// - block everything by default
	// - allow fonts/images/styles only from webview source
	// - allow scripts only when they carry this request-scoped nonce
	return `<!DOCTYPE html>
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
}
