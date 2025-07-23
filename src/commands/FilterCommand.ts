import * as vscode from 'vscode'

import BaseCommand from './BaseCommand'

import { Container } from '../container'
import { SourceFileMetaDataTreeProvider } from '../treeviews/SourceFileMetaDataTreeProvider'

export default class FilterCommand extends BaseCommand {
	private _disposable: vscode.Disposable
	container: Container
	private _treeDataProvider: SourceFileMetaDataTreeProvider
	constructor(container: Container, treeDataProvider: SourceFileMetaDataTreeProvider) {
		super()
		this._treeDataProvider = treeDataProvider
		this.container = container
		this._disposable = vscode.Disposable.from()
	}

	dispose() {
		this._disposable.dispose()
	}

	getIdentifier(): string {
		return 'filter'
	}

	filter(command: string, text: string) {
		this._treeDataProvider.filter(command, text)
	}
}
