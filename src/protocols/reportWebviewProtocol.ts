export type ReportWebViewProtocol_ChildToParent = {
	command: 'openFile',
	filePath: string
}

export type ReportWebviewProtocol_ParentToChild = {
	command: 'json',
	filePath: string
}

