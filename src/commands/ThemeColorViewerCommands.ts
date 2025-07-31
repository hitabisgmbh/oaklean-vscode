import * as vscode from 'vscode'

import BaseCommand from './BaseCommand'

import { Container } from '../container'
import { ThemeColorViewerPanel } from '../panels/ThemeColorViewerPanel'

export default class ThemeColorViewerCommands extends BaseCommand {
	private _disposable: vscode.Disposable
	container: Container
	constructor(container: Container) {
		super()
		this.container = container
		this._disposable = vscode.Disposable.from()
	}

	async execute(): Promise<void> {
		ThemeColorViewerPanel.render(this.container)
	}

	dispose() {
		this._disposable.dispose()
	}

	getIdentifier(): string {
		return 'themeColorViewer.show'
	}
}
