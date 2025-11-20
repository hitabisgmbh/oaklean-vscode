import {
	OpenSourceLocationProtocol_ChildToParent
} from './OpenSourceLocationProtocol'

import { SensorValueRepresentation } from '../types/sensorValueRepresentation'
import { ISourceFileMethodTree } from '../types/model/SourceFileMethodTree'

export enum EditorFileMethodReferenceViewProtocolCommands {
	clearMethodList = 'clear-method-list',
	updateMethodList = 'update-method-list',
	initMethods = 'initMethods',
	showPathIndex = 'showPathIndex'
}

export type EditorFileMethodReferenceViewProtocol_ChildToParent =
	| OpenSourceLocationProtocol_ChildToParent
	| { command: EditorFileMethodReferenceViewProtocolCommands.initMethods }
	| { command: EditorFileMethodReferenceViewProtocolCommands.showPathIndex }

export type EditorFileMethodReferenceViewProtocol_ParentToChild =
	| {
			command: EditorFileMethodReferenceViewProtocolCommands.updateMethodList
			debugMode: boolean
			sourceFileMethodTree: ISourceFileMethodTree
			sensorValueRepresentation: SensorValueRepresentation
	}
	| {
			command: EditorFileMethodReferenceViewProtocolCommands.clearMethodList
	}
