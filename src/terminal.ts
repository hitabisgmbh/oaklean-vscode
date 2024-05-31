import { window, ExtensionContext } from 'vscode'
import type { Disposable, Terminal } from 'vscode'

import { Container } from './container'

let _terminal: Terminal | undefined
let _disposable: Disposable | undefined

const extensionTerminalName = 'Ecode'

function ensureTerminal(): Terminal {
	if (_terminal === undefined) {
		_terminal = window.createTerminal(extensionTerminalName)
		_disposable = window.onDidCloseTerminal((e: Terminal) => {
			if (e.name === extensionTerminalName) {
				_terminal = undefined
				_disposable?.dispose()
				_disposable = undefined
			}
		})

		Container.instance?.context.subscriptions.push(_disposable)
	}

	return _terminal
}

export function runCommandInTerminal(command: string) {
	const terminal = ensureTerminal()
	terminal.show(false)
	terminal.sendText(command)
}