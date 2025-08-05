import vscode from 'vscode'

import BaseCommand from './BaseCommand'
import { IDENTIFIER as SETTINGS_IDENTIFIER } from './SettingsCommand'

import { REQUEST_ADD_NEW_PROFILE } from '../constants/webview'
import { Container } from '../container'
import { Profile } from '../types/profile'
import { APP_IDENTIFIER } from '../constants/app'
import QuickPick, { QuickPickOptions } from '../components/QuickPick'

export enum CommandIdentifiers {
	selectProfile = 'selectProfiles'
}

export default class SelectProfileCommand extends BaseCommand {
	private _disposable: vscode.Disposable
	container: Container

	constructor(container: Container) {
		super()
		this.container = container
		this._disposable = vscode.Disposable.from()
	}

	dispose() {
		this._disposable.dispose()
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
				vscode.commands.executeCommand(`${APP_IDENTIFIER}.${SETTINGS_IDENTIFIER}`)
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