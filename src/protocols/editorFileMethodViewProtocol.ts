import { SensorValueRepresentation } from '../types/sensorValueRepresentation'
import { ISourceFileMethodTree } from '../types/model/SourceFileMethodTree'

export enum EditorFileMethodViewCommands {
	clearMethodList = 'clear-method-list',
	updateMethodList = 'update-method-list',
	open = 'open',
	initMethods = 'initMethods'
}

export type EditorFileMethodViewProtocol_ChildToParent =
	| {
			command: EditorFileMethodViewCommands.open
			identifier: string
			filePath: string
	}
	| { command: EditorFileMethodViewCommands.initMethods }

export type EditorFileMethodViewProtocol_ParentToChild =
	| {
			command: EditorFileMethodViewCommands.updateMethodList
			sourceFileMethodTree: ISourceFileMethodTree
			sensorValueRepresentation: SensorValueRepresentation
	}
	| {
			command: EditorFileMethodViewCommands.clearMethodList
	}
