import {
	OpenSourceLocationProtocol_ChildToParent,
} from './OpenSourceLocationProtocol'

import { SensorValueRepresentation } from '../types/sensorValueRepresentation'
import { ISourceFileMethodTree } from '../types/model/SourceFileMethodTree'

export enum MethodViewProtocolCommands {
	clearMethodList = 'clear-method-list',
	updateMethodList = 'update-method-list',
	initMethods = 'initMethods'
}

export type MethodViewProtocol_ChildToParent =
	| OpenSourceLocationProtocol_ChildToParent
	| { command: MethodViewProtocolCommands.initMethods }

export type MethodViewProtocol_ParentToChild =
	| {
			command: MethodViewProtocolCommands.updateMethodList
			methodTrees: Record<
				string,
				{
					fileName: string
					tree: ISourceFileMethodTree
				}
			>
			sensorValueRepresentation: SensorValueRepresentation
	}
	| { command: MethodViewProtocolCommands.clearMethodList }
