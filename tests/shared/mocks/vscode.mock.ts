export default jest.mock('vscode', () => ({
	window: {
		onDidChangeActiveTextEditor: jest.fn().mockReturnValue({ dispose: jest.fn() }),
		showQuickPick: jest.fn(),
		showInputBox: jest.fn(),
		showInformationMessage: jest.fn(),
		showErrorMessage: jest.fn(),
		createQuickPick: jest.fn(() => ({
			onDidHide: jest.fn(),
			onDidChangeSelection: jest.fn(),
			// onDidChangeValue: jest.fn(),
			show: jest.fn(),
			// hide: jest.fn(),
			dispose: jest.fn(),
			// items: [],
			// selectedItems: [],
		})),
	},
	workspace: {
		onDidOpenTextDocument: jest.fn().mockReturnValue({ dispose: jest.fn() }),
		onDidCloseTextDocument: jest.fn().mockReturnValue({ dispose: jest.fn() }),
		onDidChangeTextDocument: jest.fn().mockReturnValue({ dispose: jest.fn() }),
	},
	Disposable: {
		from: jest.fn().mockReturnValue({ dispose: jest.fn() }),
	},
	commands: {
		executeCommand: jest.fn(),
	},
	Event: jest.fn(),
	EventEmitter: jest.fn().mockImplementation(() => ({
		on: jest.fn(),
		dispose: jest.fn(),
		fire: jest.fn()
	})),
	TreeItem: jest.fn().mockImplementation(() => {
		return function () {
			// Mock properties and methods as needed
		}
	}),
	Uri: {
		file: jest.fn((path) => ({
			path: path,
		})),
	},
}))
