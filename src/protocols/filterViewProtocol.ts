import { FilterPaths } from '../types/FilterPaths'

export enum FilterViewCommands {
	viewLoaded = 'viewLoaded',
	renderFilterView = 'renderFilterView',
	filterPathsEdited = 'filterPathsEdited',
}

export type FilterViewProtocol_ChildToParent = {
	command: FilterViewCommands.viewLoaded;
} | {
	command: FilterViewCommands.filterPathsEdited;
	filePaths: FilterPaths
}

export type FilterViewProtocol_ParentToChild = {
	command: FilterViewCommands.renderFilterView;
	filePaths: FilterPaths
}
