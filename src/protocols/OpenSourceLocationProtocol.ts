export enum OpenSourceLocationProtocolCommands {
	openSourceLocation = 'openSourceLocation'
}

export type OpenSourceLocationProtocol_ChildToParent =
	| {
			command: OpenSourceLocationProtocolCommands.openSourceLocation
			identifier: string
			relativePath: string
	}