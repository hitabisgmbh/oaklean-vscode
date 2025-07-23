import vscode from 'vscode'


import BaseCommand from './BaseCommand'

import { Container } from '../container'
import { SourceFileMetaDataTreeProvider } from '../treeviews/SourceFileMetaDataTreeProvider'
import { SortDirection } from '../types/sortDirection'

export enum CommandIdentifiers {
	changeSortDirectionDefaultToAscCommand = 'changeSortDirectionDefaultToAscCommand',
	changeSortDirectionAscToDescCommand = 'changeSortDirectionAscToDescCommand',
	changeSortDirectionDescToDefaultCommand = 'changeSortDirectionDescToDefaultCommand'
}

export enum ContextOptions {
	sortDirectionDefault = 'sortDirectionDefault',
	sortDirectionDesc = 'sortDirectionDesc',
	sortDirectionAsc = 'sortDirectionAsc'
}

export default class ChangeSortDirectionCommands extends BaseCommand {
	private _disposable: vscode.Disposable
	container: Container
	private _treeDataProvider: SourceFileMetaDataTreeProvider
	private _direction: SortDirection

	constructor(container: Container, treeDataProvider: SourceFileMetaDataTreeProvider, direction: SortDirection) {
		super()
		this.container = container
		this._treeDataProvider = treeDataProvider
		this._direction = direction
		this._disposable = vscode.Disposable.from()

		container.storage.storeWorkspace('sortDirection', SortDirection.default)
		vscode.commands.executeCommand('setContext', ContextOptions.sortDirectionDefault, true)
		vscode.commands.executeCommand('setContext', ContextOptions.sortDirectionDesc, false)
		vscode.commands.executeCommand('setContext', ContextOptions.sortDirectionAsc, false)
	}

	dispose() {
		this._disposable.dispose()
	}

	getIdentifier(): CommandIdentifiers {
		switch (this._direction) {
			case SortDirection.asc:
				return CommandIdentifiers.changeSortDirectionDefaultToAscCommand
			case SortDirection.desc:
				return CommandIdentifiers.changeSortDirectionAscToDescCommand
			case SortDirection.default:
				return CommandIdentifiers.changeSortDirectionDescToDefaultCommand
		}
	}
	execute() {
		const currentDirection = this._direction
		switch (currentDirection) {
			case SortDirection.asc:
				this.directionChange(SortDirection.desc, false, true, false)
				break
			case SortDirection.desc:
				this.directionChange(SortDirection.default, true, false, false)
				break
			case SortDirection.default:
				this.directionChange(SortDirection.asc, false, false, true)
				break
		}

	}
	directionChange(newDirection: SortDirection, defaultToAsc: boolean, descToDefault: boolean, ascToDesc: boolean) {
		this.container.storage.storeWorkspace('sortDirection', newDirection)
		vscode.commands.executeCommand('setContext', ContextOptions.sortDirectionDefault, defaultToAsc)
		vscode.commands.executeCommand('setContext', ContextOptions.sortDirectionDesc, descToDefault)
		vscode.commands.executeCommand('setContext', ContextOptions.sortDirectionAsc, ascToDesc)
	}
}