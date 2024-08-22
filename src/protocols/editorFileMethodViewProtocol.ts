import { PathIndex, SourceFileMetaData } from '@oaklean/profiler-core'

import { SensorValueRepresentation } from '../types/sensorValueRepresentation'

export enum EditorFileMethodViewCommands {
	createMethodList = 'create-method-list',
	open = 'open',
	initMethods = 'initMethods'
}

export type EditorFileMethodViewProtocol_ChildToParent =
	{ command: EditorFileMethodViewCommands.open, identifier: string } |
	{ command: EditorFileMethodViewCommands.initMethods }

export type EditorFileMethodViewProtocol_ParentToChild = {
	command: EditorFileMethodViewCommands.createMethodList;
	methodList: SourceFileMetaData | undefined,
	pathIndex: PathIndex | undefined,
	sensorValueRepresentation: SensorValueRepresentation | undefined
}