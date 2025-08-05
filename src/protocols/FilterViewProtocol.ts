import { FilterPaths } from '../types/FilterPaths'

export enum FilterViewCommands {
	viewLoaded = 'viewLoaded',
	renderFilterView = 'renderFilterView',
	includedFilterPathEdited = 'includedFilterPathEdited',
	excludedFilterPathEdited = 'excludedFilterPathEdited',
}

export type FilterViewProtocol_ChildToParent = {
	command: FilterViewCommands.viewLoaded;
} | {
	command: FilterViewCommands.includedFilterPathEdited;
	includedFilterPath: string
}| {
	command: FilterViewCommands.excludedFilterPathEdited;
	excludedFilterPath: string
}

export type FilterViewProtocol_ParentToChild = {
	command: FilterViewCommands.renderFilterView;
	filePaths: FilterPaths
}
