import {
	SourceNodeIdentifier_string
} from '@oaklean/profiler-core/dist/src/types'

export type OpenSourceLocationCommandArgs = {
	relativeWorkspacePath: string
	sourceNodeIdentifier: SourceNodeIdentifier_string
}

export enum OpenSourceLocationCommandIdentifiers {
	openSourceLocation = 'openSourceLocation'
}