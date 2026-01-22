export enum DocumentationViewCommands {
	init = 'init',
	open = 'open',
	requestDocs = 'requestDocs',
	search = 'search',
	openFile = 'openFile',
	openMissingFile = 'openMissingFile',
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
		type: DocumentationViewCommands.init
		files: DocumentationFile[]
		initialFile: string
		resourceBase?: string
		docsBasePath?: string
		imageWhitelist?: string[]
	}
	| {
		type: DocumentationViewCommands.open
		filePath: string
		anchor?: string
	}

// Child -> Parent
export type DocumentationView_ChildToParent =
	| { type: DocumentationViewCommands.requestDocs }
	| { type: DocumentationViewCommands.search; query: string }
	| { type: DocumentationViewCommands.openFile; path: string; anchor?: string }
	| { type: DocumentationViewCommands.openMissingFile; path: string }
	| { type: DocumentationViewCommands.openExternal; href: string }
