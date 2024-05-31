import { ExtensionContext } from 'vscode'

import { Container } from './container'
import { Storage } from './storage'



process.env.RUNNING_IN_EXTENSION = 'true'



export function activate(context: ExtensionContext) {

	const storage = new Storage(context)
	Container.create(context, storage)
}

export function deactivate() {
	return undefined
}
