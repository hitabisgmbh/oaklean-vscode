import {
	OpenSourceLocationProtocol_ChildToParent
}	 from './OpenSourceLocationProtocol'
export enum EditorFileMethodReferenceViewProtocolCommands {
	closeActiveFile = 'closeActiveFile',
	updateFileName = 'updateFileName',
	requestFileName = 'requestFileName',
	updateFirstFunction = 'updateFirstFunction',
	requestFirstFunction = 'requestFirstFunction'
}

export type FirstFunctionEntry = {
	name: string
	cpuTime?: number
	cpuEnergy?: number
	ramEnergy?: number
	identifier?: string
	relativePath?: string
	isNavigable?: boolean
	notPresentInOriginalSourceCode?: boolean

}

export type EditorFileMethodReferenceViewProtocol_ChildToParent =
	| {
			command: EditorFileMethodReferenceViewProtocolCommands.closeActiveFile
		}
	| {
			command: EditorFileMethodReferenceViewProtocolCommands.requestFileName
		}
	| {
			command: EditorFileMethodReferenceViewProtocolCommands.requestFirstFunction
		}
	| OpenSourceLocationProtocol_ChildToParent 
		

	export type EditorFileMethodReferenceViewProtocol_ParentToChild =
	| {
			command: EditorFileMethodReferenceViewProtocolCommands.updateFileName
			fileName: string
		}
	| {
			command: EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction
			functionName: string
			main?: FirstFunctionEntry
			langInternal?: FirstFunctionEntry[]
			intern?: FirstFunctionEntry[]
			extern?: FirstFunctionEntry[]
		}
