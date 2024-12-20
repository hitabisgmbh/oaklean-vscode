import BaseCommand from './BaseCommand'

import { Container } from '../container'
import { SourceFileMetaDataTreeProvider } from '../treeviews/SourceFileMetaDataTreeProvider'

export default class FilterCommand extends BaseCommand {
	container: Container
	private _treeDataProvider: SourceFileMetaDataTreeProvider
	constructor(container: Container, treeDataProvider: SourceFileMetaDataTreeProvider) {
		super()
		this._treeDataProvider = treeDataProvider
		this.container = container
	}

	getIdentifier(): string {
		return 'filter'
	}

	filter(command: string, text: string) {
		this._treeDataProvider.filter(command, text)
	}
}
