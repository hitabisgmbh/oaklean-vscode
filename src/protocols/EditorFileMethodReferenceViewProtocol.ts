export enum EditorFileMethodReferenceViewProtocolCommands {
	closeActiveFile = 'closeActiveFile',
	updateFileName = 'updateFileName',
	requestFileName = 'requestFileName'
}

export type EditorFileMethodReferenceViewProtocol_ChildToParent = {
	command:
		| EditorFileMethodReferenceViewProtocolCommands.closeActiveFile
		| EditorFileMethodReferenceViewProtocolCommands.requestFileName
};

export type EditorFileMethodReferenceViewProtocol_ParentToChild = {
	command: EditorFileMethodReferenceViewProtocolCommands.updateFileName;
	// file name payload to display in the view 
	fileName: string;
}
