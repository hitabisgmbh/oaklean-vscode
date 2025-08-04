export enum ReportViewProtocolCommands {
	openAsJson = 'open-as-json'
}

export type ReportViewProtocol_ChildToParent = {
	command: ReportViewProtocolCommands.openAsJson
}
