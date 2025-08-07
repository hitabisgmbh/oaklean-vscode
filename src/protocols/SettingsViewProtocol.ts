import { Profile } from '../types/profile'

export enum SettingsViewProtocolCommands {
	viewLoaded = 'viewLoaded',
	selectProfile = 'selectProfile',
	deleteProfile = 'deleteProfile',
	addProfile = 'addProfile',
	updateProfile = 'updateProfile',
	loadProfiles = 'loadProfiles',
	clearInput = 'clearInput',
}

export type SettingsViewProtocol_ChildToParent = {
	command: SettingsViewProtocolCommands.viewLoaded
} |{
	command: SettingsViewProtocolCommands.selectProfile,
	profileName: string
} | {
	command: SettingsViewProtocolCommands.deleteProfile,
	profileName: string
} | {
	command: SettingsViewProtocolCommands.addProfile,
	profile: Profile
} | {
	command: SettingsViewProtocolCommands.updateProfile,
	profile: Profile
}

export type SettingsViewProtocol_ParentToChild = {
	command: SettingsViewProtocolCommands.loadProfiles,
	profile: Profile | undefined,
	profiles: Profile[]
} | {
	command: SettingsViewProtocolCommands.clearInput
}