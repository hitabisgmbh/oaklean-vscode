import vscode from 'vscode'

import BaseCommand from './BaseCommand'

import { COMMAND_OPEN_SETTINGS, DOT, PLACEHOLDER_SELECT_PROFILE, PROFILE_SELECTION, REQUEST_ADD_NEW_PROFILE } from '../constants/webview'
import { Container } from '../container'
import { Profile } from '../types/profile'
import { APP_IDENTIFIER } from '../constants/app'
import { ERROR_NO_PROFILE_FOUND } from '../constants/infoMessages'

export enum CommandIdentifiers {
	selectProfile = 'selectProfiles'
}

export default class SelectProfileCommand extends BaseCommand {
	container: Container

	constructor(container: Container) {
		super()
		this.container = container
	}

	getIdentifier(): CommandIdentifiers {
		return CommandIdentifiers.selectProfile
	}

	async execute() {
		const profiles = this.container.profileHelper.profiles
		const profileName = this.container.profileHelper.currentProfile?.name ?? ''
		const quickPickItems: {
			label: string,
			name?: string
		}[] = (profiles ? profiles.map(profile => {
			let label = profile.name
			if (profile.name === profileName) {
				label += PROFILE_SELECTION
			}
			return { label, name: profile.name }
		}) : []) || []

		quickPickItems.push({ label: REQUEST_ADD_NEW_PROFILE })
		const placeholder = PLACEHOLDER_SELECT_PROFILE
		const selectedProfile = await vscode.window.showQuickPick(quickPickItems, {
			placeHolder: placeholder
		})

		if (selectedProfile !== undefined && selectedProfile !== null) {
			if (selectedProfile.label === REQUEST_ADD_NEW_PROFILE) {
				vscode.commands.executeCommand(APP_IDENTIFIER + DOT + COMMAND_OPEN_SETTINGS)
			} else {
				let profileFound = profiles ?
					profiles.find((p: Profile) => p.name === selectedProfile?.name) : undefined

				if (profileFound !== undefined && profileFound !== null) {
					profileFound = {
						name: profileFound.name,
						color: profileFound.color,
						measurement: profileFound.measurement,
						formula: profileFound.formula
					}
				} else {
					throw new Error(ERROR_NO_PROFILE_FOUND)
				}
				this.container.storage.storeWorkspace('profile', profileFound)
			}
		}
	}
}