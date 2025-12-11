export enum DocumentationViewCommands {
	init = 'init',
	open = 'open',
	requestDocs = 'requestDocs',
	search = 'search',
	openFile = 'openFile',
	openExternal = 'openExternal'
}

export type DocumentationFile = {
	path: string
	name: string
	content: string
}

// Parent -> Child
export type DocumentationView_ParentToChild =
	| {
		command: DocumentationViewCommands.init
		files: DocumentationFile[]
		initialFile: string
		resourceBase?: string
	}
	| {
		command: DocumentationViewCommands.open
		filePath: string
		anchor?: string
	}

// Child -> Parent
export type DocumentationView_ChildToParent =
	| { command: DocumentationViewCommands.requestDocs }
	| { command: DocumentationViewCommands.search; query: string }
	| { command: DocumentationViewCommands.openFile; path: string; anchor?: string }
	| { command: DocumentationViewCommands.openExternal; href: string }
