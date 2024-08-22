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
		const quickPickOptions: QuickPickOptions = new Map()
		for (const profile of this.container.profileHelper.profiles) {
			quickPickOptions.set(profile.name, {
				selectionCallback: () => {
					this.container.storage.storeWorkspace('profile', profile)
				}
			})
		}
		quickPickOptions.set(REQUEST_ADD_NEW_PROFILE, {
			selectionCallback: () => {
				vscode.commands.executeCommand(APP_IDENTIFIER + DOT + COMMAND_OPEN_SETTINGS)
			}
		})

		const currentProfile = this.container.storage.getWorkspace('profile') as Profile
		const quickPick = new QuickPick(quickPickOptions)
		if (currentProfile) {
			quickPick.setCurrentItem(currentProfile.name)
		}
		quickPick.show()
		return quickPick
	}
}