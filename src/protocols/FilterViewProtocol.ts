import { FilterPaths } from '../types/FilterPaths'

export enum FilterViewProtocolCommands {
	viewLoaded = 'viewLoaded',
	renderFilterView = 'renderFilterView',
	includedFilterPathEdited = 'includedFilterPathEdited',
	excludedFilterPathEdited = 'excludedFilterPathEdited',
}

export type FilterViewProtocol_ChildToParent = {
	command: FilterViewProtocolCommands.viewLoaded;
} | {
	command: FilterViewProtocolCommands.includedFilterPathEdited;
	includedFilterPath: string
}| {
	command: FilterViewProtocolCommands.excludedFilterPathEdited;
	excludedFilterPath: string
}

export type FilterViewProtocol_ParentToChild = {
	command: FilterViewProtocolCommands.renderFilterView;
	filePaths: FilterPaths
}
