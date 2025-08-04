import { SensorValueRepresentation } from '../types/sensorValueRepresentation'
import { ISourceFileMethodTree } from '../types/model/SourceFileMethodTree'

export enum MethodViewCommands {
	clearMethodList = 'clear-method-list',
	updateMethodList = 'update-method-list',
	open = 'open',
	initMethods = 'initMethods'
}

export type MethodViewProtocol_ChildToParent =
	| {
			command: MethodViewCommands.open
			identifier: string
			filePath: string
	}
	| { command: MethodViewCommands.initMethods }

export type MethodViewProtocol_ParentToChild =
	| {
			command: MethodViewCommands.updateMethodList
			methodTrees: Record<string, {
				fileName: string
				tree: ISourceFileMethodTree
			}>
			sensorValueRepresentation: SensorValueRepresentation
	}
	| { command: MethodViewCommands.clearMethodList }
