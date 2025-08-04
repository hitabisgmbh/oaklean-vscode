import { useEffect, useState } from 'react'
import { VSCodePanels } from '@vscode/webview-ui-toolkit/react'

import './main.css'
import { EditProfilePanel } from './components/EditProfilePanel'
import { NewProfilePanel } from './components/NewProfilePanel'

import { Profile, DEFAULT_PROFILE } from '../../types/profile'
import {
	SettingsViewCommands,
	SettingsViewProtocol_ChildToParent,
	SettingsViewProtocol_ParentToChild
} from '../../protocols/SettingsViewProtocol'

declare const acquireVsCodeApi: any

export const vscode = acquireVsCodeApi()

function postToProvider(message: SettingsViewProtocol_ChildToParent) {
	vscode.postMessage(message)
}

export function App() {
	const [newDefaultProfile, setNewDefaultProfile] = useState<Profile>({
		...DEFAULT_PROFILE,
		name: ''
	})
	const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE)
	const [profiles, setProfiles] = useState<Profile[]>([])

	function handleExtensionMessages(message: {
		data: SettingsViewProtocol_ParentToChild
	}) {
		switch (message.data.command) {
			case SettingsViewCommands.loadProfiles:
				setProfile(
					message.data.profile || message.data.profiles[0] || DEFAULT_PROFILE
				)
				if (message.data.profiles.length > 0) {
					setProfiles(message.data.profiles)
				} else {
					setProfiles([DEFAULT_PROFILE])
				}
				break
			case SettingsViewCommands.clearInput:
				setNewDefaultProfile({
					...DEFAULT_PROFILE,
					name: ''
				})
				break
		}
	}

	useEffect(() => {
		window.addEventListener('message', handleExtensionMessages)
		postToProvider({ command: SettingsViewCommands.viewLoaded })

		return () => {
			window.removeEventListener('message', handleExtensionMessages)
		}
	}, [])

	return (
		<div className="webview-body">
			<header>
				<h1 className="title">Settings</h1>
			</header>
			<section>
				<VSCodePanels>
					<EditProfilePanel
						profile={profile}
						profiles={profiles}
						onSave={(profile) => {
							postToProvider({
								command: SettingsViewCommands.updateProfile,
								profile
							})
						}}
						onProfileChange={(profileName) => {
							postToProvider({
								command: SettingsViewCommands.selectProfile,
								profileName
							})
						}}
						onProfileDelete={(profileName) => {
							postToProvider({
								command: SettingsViewCommands.deleteProfile,
								profileName
							})
						}}
					/>
					<NewProfilePanel
						profile={newDefaultProfile}
						onSave={(profile) => {
							postToProvider({
								command: SettingsViewCommands.addProfile,
								profile
							})
						}}
					/>
				</VSCodePanels>
			</section>
		</div>
	)
}
