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
}

export type EditorFileMethodReferenceViewProtocol_ChildToParent = {
	command:
		| EditorFileMethodReferenceViewProtocolCommands.closeActiveFile
		| EditorFileMethodReferenceViewProtocolCommands.requestFileName
		| EditorFileMethodReferenceViewProtocolCommands.requestFirstFunction
};

export type EditorFileMethodReferenceViewProtocol_ParentToChild = {
	command: EditorFileMethodReferenceViewProtocolCommands.updateFileName;
	// file name payload to display in the view
	fileName: string;
} | {
	command: EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction;
	functionName: string;
	main?: FirstFunctionEntry;
	langInternal?: FirstFunctionEntry[];
	intern?: FirstFunctionEntry[];
	extern?: FirstFunctionEntry[];
}
