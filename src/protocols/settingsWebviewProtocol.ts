import { Profile } from '../types/profile'

export type SettingsWebViewProtocol_ChildToParent = {
	command: 'selectProfile',
	profileName: string
} | {
	command: 'deleteProfile',
	profileName: string
} | {
	command: 'addProfile',
	profile: Profile
} | {
	command: 'updateProfile',
	profile: Profile
}

export type SettingsWebViewProtocol_ParentToChild = {
	command: 'loadProfiles',
	profile: Profile | undefined,
	profiles: Profile[]
} | {
	command: 'updateProfile',
	profile: Profile
} | {
	command: 'clearInput'
}