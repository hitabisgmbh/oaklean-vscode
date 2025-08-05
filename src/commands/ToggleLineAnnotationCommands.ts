import vscode from 'vscode'

import BaseCommand from './BaseCommand'

import { Container } from '../container'

export enum CommandIdentifiers {
	disableLineAnnotations = 'disableLineAnnotations',
	enableLineAnnotations = 'enableLineAnnotations',
}

export enum ToggleLineAnnotationAction {
	disable = 'disable',
	enable = 'enable'
}

export enum ContextOptions {
	lineAnnotationsEnabled = 'lineAnnotationsEnabled'
}

export default class ToggleLineAnnotationCommands extends BaseCommand {
	private _disposable: vscode.Disposable
	container: Container
	action: ToggleLineAnnotationAction

	constructor(container: Container, action: ToggleLineAnnotationAction) {
		super()
		this.container = container
		this.action = action
		this._disposable = vscode.Disposable.from()

		const lineAnnotationsEnabled = !!container.storage.getWorkspace('enableLineAnnotations')
		vscode.commands.executeCommand('setContext', ContextOptions.lineAnnotationsEnabled, lineAnnotationsEnabled)
	}

	dispose() {
		this._disposable.dispose()
	}

	getIdentifier(): CommandIdentifiers {
		switch (this.action) {
			case ToggleLineAnnotationAction.disable:
				return CommandIdentifiers.disableLineAnnotations
			case ToggleLineAnnotationAction.enable:
				return CommandIdentifiers.enableLineAnnotations
		}
	}

	execute() {
		if (this.action === 'disable') {
			this.container.storage.storeWorkspace('enableLineAnnotations', false)
			vscode.commands.executeCommand('setContext', ContextOptions.lineAnnotationsEnabled, false)
		} else if (this.action === 'enable') {
			this.container.storage.storeWorkspace('enableLineAnnotations', true)
			vscode.commands.executeCommand('setContext', ContextOptions.lineAnnotationsEnabled, true)
		}
	}

}
