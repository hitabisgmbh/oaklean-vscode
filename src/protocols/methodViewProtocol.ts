import { FilterPaths } from '../types/FilterPaths'
import { MethodViewCommands } from '../types/methodViewCommands'
import { MethodViewMessageTypes } from '../types/methodViewMessageTypes'
import { SensorValueRepresentation } from '../types/sensorValueRepresentation'
import { SortDirection } from '../types/sortDirection'
import { MethodList } from '../model/MethodList'

export type MethodViewProtocol_ChildToParent = {
	command: MethodViewCommands;
	identifier: string;
	filePath: string;
} | { command: MethodViewCommands.initMethods }


export type MethodViewProtocol_ParentToChild =
	| { type: MethodViewMessageTypes.sortDirectionChange, sortDirection: SortDirection }
	| { type: MethodViewMessageTypes.sensorValueTypeChange, sensorValueRepresentation: SensorValueRepresentation }
	| { type: MethodViewMessageTypes.filterPathChange, filterPaths: FilterPaths }
	| {
		type: MethodViewMessageTypes.displayMethods, methodList: MethodList,
		sensorValueRepresentation: SensorValueRepresentation, filterPaths: FilterPaths
	}
	| { type: MethodViewMessageTypes.clear }
