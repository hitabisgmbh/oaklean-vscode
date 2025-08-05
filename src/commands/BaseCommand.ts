import vscode, { Disposable } from 'vscode'

import { APP_IDENTIFIER } from '../constants/app'
import { SourceFileMetaDataTreeProvider } from '../treeviews/SourceFileMetaDataTreeProvider'

export default class BaseCommand {
	register() {
		const identifiers = this.getIdentifier()
		if (typeof identifiers === 'object' && Array.isArray(identifiers)) {
			return Disposable.from(
				...identifiers.map(identifier => 
					vscode.commands.registerCommand(`${APP_IDENTIFIER}.${identifier}`, () => {
						this.execute()
					})
				)
			)
		} else {
			console.debug(`Register command: ${APP_IDENTIFIER}.${identifiers}`)
			return vscode.commands.registerCommand(`${APP_IDENTIFIER}.${identifiers}`, (uri: vscode.Uri) => {
				this.execute(uri)
			})
		}

	}

	execute(uri?: vscode.Uri, treeDataProvider?: SourceFileMetaDataTreeProvider) {
		throw new Error('execute() not yet implemented')
	}

	getIdentifier(): string | string[] {
		throw new Error('getIdentifier() not yet implemented')
	}
}