import * as vscode from 'vscode'

import { APP_IDENTIFIER } from '../constants/app'
import { Container } from '../container'
const SCHEMA_NAME = `${APP_IDENTIFIER}.json`

export class JsonTextDocumentContentProvider
	implements vscode.TextDocumentContentProvider {
	private _container: Container
	private _contentMap: Map<string, string> = new Map()

	private _subscriptions: vscode.Disposable[] = []

	constructor(container: Container) {
		this._container = container
		this._subscriptions.push(
			vscode.workspace.registerTextDocumentContentProvider(SCHEMA_NAME, this),
			this._container.eventHandler.onTextDocumentClose(({ document }) => {
				// Remove content
				if (document.uri.scheme === SCHEMA_NAME) {
					this._contentMap.delete(document.uri.fsPath)
				}
			})
		)
	}

	dispose(): void {
		this._subscriptions.forEach((sub) => sub.dispose())
		this._contentMap.clear()
	}

	async openFileJsonReadonly(uri: vscode.Uri, data: string) {
		this.setContent(uri, data)
		const uriWithSchema = uri.with({ scheme: SCHEMA_NAME })
		const doc = await vscode.workspace.openTextDocument(uriWithSchema)
		await vscode.languages.setTextDocumentLanguage(doc, 'json')
		await vscode.window.showTextDocument(doc, {
			preview: true,
			viewColumn: vscode.ViewColumn.Beside
		})
	}

	provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {
		const content = this._contentMap.get(uri.fsPath)
		return content ? content : ''
	}

	setContent(uri: vscode.Uri, content: string) {
		this._contentMap.set(uri.fsPath, content)
	}
}
