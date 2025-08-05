export enum ReportViewProtocolCommands {
	viewLoaded = 'view-loaded',
	openAsJson = 'open-as-json',
	setReportData = 'set-report-data'
}

export type ReportViewProtocol_ParentToChild = {
	command: ReportViewProtocolCommands.setReportData
	data: {
		fileName: string
		commitHash: string | undefined
		formattedCommitTimestamp: string
		formattedTimestamp: string
		version: string
		projectId: string
		uncommittedChanges: boolean | undefined
		nodeVersion: string
		origin: string
		os: {
			platform: string
			distro: string
			release: string,
			arch: string
		},
		runtime: number
		sensorInterface: undefined | {
			type: string
			sampleInterval: number
		}
	}
}


export type ReportViewProtocol_ChildToParent = {
	command: ReportViewProtocolCommands.viewLoaded
} | {
	command: ReportViewProtocolCommands.openAsJson
}