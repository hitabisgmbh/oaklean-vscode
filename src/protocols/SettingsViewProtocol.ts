import { Profile } from '../types/profile'

export enum SettingsViewCommands {
	viewLoaded = 'viewLoaded',
	selectProfile = 'selectProfile',
	deleteProfile = 'deleteProfile',
	addProfile = 'addProfile',
	updateProfile = 'updateProfile',
	loadProfiles = 'loadProfiles',
	clearInput = 'clearInput',
}

export type SettingsViewProtocol_ChildToParent = {
	command: SettingsViewCommands.viewLoaded
} |{
	command: SettingsViewCommands.selectProfile,
	profileName: string
} | {
	command: SettingsViewCommands.deleteProfile,
	profileName: string
} | {
	command: SettingsViewCommands.addProfile,
	profile: Profile
} | {
	command: SettingsViewCommands.updateProfile,
	profile: Profile
}

export type SettingsViewProtocol_ParentToChild = {
	command: SettingsViewCommands.loadProfiles,
	profile: Profile | undefined,
	profiles: Profile[]
} | {
	command: SettingsViewCommands.clearInput
}