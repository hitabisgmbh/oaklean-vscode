import {
	OpenSourceLocationProtocol_ChildToParent
} from './OpenSourceLocationProtocol'

import { SensorValueRepresentation } from '../types/sensorValueRepresentation'
import { ISourceFileMethodTree } from '../types/model/SourceFileMethodTree'

export enum EditorFileMethodViewProtocolCommands {
	clearMethodList = 'clear-method-list',
	updateMethodList = 'update-method-list',
	initMethods = 'initMethods',
	showPathIndex = 'showPathIndex'
}

export type EditorFileMethodViewProtocol_ChildToParent =
	| OpenSourceLocationProtocol_ChildToParent
	| { command: EditorFileMethodViewProtocolCommands.initMethods }
	| { command: EditorFileMethodViewProtocolCommands.showPathIndex }

export type EditorFileMethodViewProtocol_ParentToChild =
	| {
			command: EditorFileMethodViewProtocolCommands.updateMethodList
			debugMode: boolean
			sourceFileMethodTree: ISourceFileMethodTree
			sensorValueRepresentation: SensorValueRepresentation
	}
	| {
			command: EditorFileMethodViewProtocolCommands.clearMethodList
	}
