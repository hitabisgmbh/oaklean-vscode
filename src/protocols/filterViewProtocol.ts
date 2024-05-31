import { FilterViewCommands } from '../types/filterViewCommands'

export type FilterViewProtocol_ChildToParent = {
	command: FilterViewCommands;
	text: string;
}

export type FilterViewProtocol_ParentToChild = {
	command: FilterViewCommands;
	text: string;
}
