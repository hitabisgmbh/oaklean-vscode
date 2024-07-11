import vscode from 'vscode'

import BaseCommand from './BaseCommand'

import { COMMAND_OPEN_SETTINGS, DOT, REQUEST_ADD_NEW_PROFILE } from '../constants/webview'
import { Container } from '../container'
import { Profile } from '../types/profile'
import { APP_IDENTIFIER } from '../constants/app'
import { ERROR_NO_PROFILE_FOUND } from '../constants/infoMessages'
import QuickPick, { QuickPickOptions } from '../components/QuickPick'

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
		const quickPickItems: {
			label: string
		}[] = (profiles ? profiles.map(profile => {
			const label = profile.name
			return { label }
		}) : []) || []
		quickPickItems.push({ label: REQUEST_ADD_NEW_PROFILE })

		const quickPickOptions: QuickPickOptions = new Map()
		for (const selectedProfile of quickPickItems) {
			quickPickOptions.set(selectedProfile.label, {
				selectionCallback: () => {
					if (selectedProfile !== undefined && selectedProfile !== null) {
						if (selectedProfile.label === REQUEST_ADD_NEW_PROFILE) {
							vscode.commands.executeCommand(APP_IDENTIFIER + DOT + COMMAND_OPEN_SETTINGS)
						} else {
							let profileFound = profiles ?
								profiles.find((p: Profile) => p.name === selectedProfile?.label) : undefined

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
			})
		}

		const currentProfile = this.container.storage.getWorkspace('profile') as Profile
		const quickPick = new QuickPick(quickPickOptions)
		if (currentProfile){
			quickPick.setCurrentItem(currentProfile.name)
		}
		quickPick.show()
		return quickPick
	}
}