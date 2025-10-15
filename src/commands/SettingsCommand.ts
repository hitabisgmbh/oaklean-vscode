import vscode from 'vscode'

import BaseCommand from './BaseCommand'

import { Container } from '../container'
import { SettingsViewPanel } from '../panels/SettingsViewPanel'

export const IDENTIFIER = 'settings'

export default class SettingsCommand extends BaseCommand {
	private _disposable: vscode.Disposable
	container: Container
	constructor(container: Container) {
		super()
		this.container = container
		this._disposable = vscode.Disposable.from()
	}

	async execute(): Promise<void> {
		SettingsViewPanel.render(this.container)
	}

	dispose() {
		this._disposable.dispose()
	}

	getIdentifier(): string {
		return IDENTIFIER
	}
}
