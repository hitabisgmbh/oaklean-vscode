import vscode, { Disposable } from 'vscode'

import { SettingsWebViewPanel } from '../panels/SettingsWebViewPanel'
import { Container } from '../container'
import { Profile } from '../types/profile'
import { DOT, COMMAND_OPEN_SETTINGS } from '../constants/webview'
import { APP_IDENTIFIER } from '../constants/app'
import { Color } from '../types/color'
import { checkFormulaValidity } from '../helper/FormulaHelper'
import { ERROR_FAILED_TO_ADD_PROFILE, ERROR_FAILED_TO_DELETE_PROFILE, ERROR_FAILED_TO_SAVE_PROFILE, ERROR_FORMULA_NOT_VALID, ERROR_SAME_NAME, INFO_PROFILE_ADDED, INFO_PROFILE_ASK_DELETED, INFO_PROFILE_DELETED, INFO_PROFILE_SAVED, NO, YES } from '../constants/infoMessages'
import { ProfileChangeEvent } from '../helper/EventHandler'

export default class SettingsWebviewController implements Disposable {
	private readonly _disposable: Disposable
	private container: Container

	constructor(container: Container) {
		this.container = container
		this._disposable = Disposable.from(
			vscode.commands.registerCommand(
				APP_IDENTIFIER + DOT + COMMAND_OPEN_SETTINGS, this.openSettingsPanel.bind(this)),
			this.container.eventHandler.onProfileChange(this.profileChanges.bind(this))
		)
	}
	get profiles(): Profile[] {
		return this.container.profileHelper.profiles
	}
	get profile(): Profile | undefined {
		return this.container.profileHelper.currentProfile
	}
	dispose() {
		this._disposable.dispose()
	}

	private profileChanges(event: ProfileChangeEvent) {
		if (SettingsWebViewPanel.currentPanel) {
			SettingsWebViewPanel.currentPanel.postMessageToWebview({
				command: 'updateProfile',
				profile: event.profile
			})
			SettingsWebViewPanel.currentPanel.postMessageToWebview({
				command: 'loadProfiles',
				profile: event.profile,
				profiles: this.profiles
			})
		}
	}

	private openSettingsPanel(): void {
		SettingsWebViewPanel.render(this.container)
		if (SettingsWebViewPanel.currentPanel) {
			SettingsWebViewPanel.currentPanel.postMessageToWebview({
				command: 'loadProfiles',
				profile: this.profile,
				profiles: this.profiles
			})
		}
	}

	public selectProfile(profileName: string) {
		const profiles = this.profiles
		const profile = profiles ? profiles.find((p: Profile) => p.name === profileName) : undefined
		let specificData: Profile

		if (profile !== undefined) {
			specificData = {
				name: profile.name,
				color: profile.color,
				measurement: profile.measurement,
				formula: profile.formula
			}
		} else {
			specificData = this.defaultProfile()
		}
		this.container.storage.storeWorkspace('profile', specificData)
	}

	updateProfile(profile: Profile) {
		try {
			if (profile.measurement === 'customFormula' && !checkFormulaValidity(profile.formula)) {
				vscode.window.showErrorMessage(ERROR_FORMULA_NOT_VALID)
				return
			}
			this.container.profileHelper.updateProfile(profile)
			vscode.window.showInformationMessage(INFO_PROFILE_SAVED)

			this.container.storage.storeWorkspace('profile', profile)
		} catch (error: any) {
			vscode.window.showErrorMessage(ERROR_FAILED_TO_SAVE_PROFILE + error.message)
		}
	}

	addProfile(profile: Profile) {
		try {
			if (profile.measurement === 'customFormula' && !checkFormulaValidity(profile.formula)) {
				vscode.window.showErrorMessage(ERROR_FORMULA_NOT_VALID)
				return
			}
			const success = this.container.profileHelper.addProfile(profile)
			if (success) {
				vscode.window.showInformationMessage(INFO_PROFILE_ADDED)
				if (SettingsWebViewPanel.currentPanel) {
					SettingsWebViewPanel.currentPanel.postMessageToWebview({
						command: 'loadProfiles',
						profile: this.profile,
						profiles: this.profiles
					})
					SettingsWebViewPanel.currentPanel.postMessageToWebview({
						command: 'clearInput'
					})
				}
			} else {
				throw new Error(ERROR_SAME_NAME)
			}
		} catch (error: any) {
			vscode.window.showErrorMessage(ERROR_FAILED_TO_ADD_PROFILE + error.message)
		}
	}

	async deleteProfile(profileName: string): Promise<void> {
		try {
			const confirmation = await vscode.window.showInformationMessage(INFO_PROFILE_ASK_DELETED, YES, NO)
			if (confirmation !== YES) {
				return
			}
			this.container.profileHelper.deleteProfile(profileName)
			vscode.window.showInformationMessage(INFO_PROFILE_DELETED)

			const firstProfile = (this.profiles && this.profiles.length > 0) ? this.profiles[0] : this.defaultProfile()

			this.container.storage.storeWorkspace('profile', firstProfile)
		} catch (error: any) {
			vscode.window.showErrorMessage(ERROR_FAILED_TO_DELETE_PROFILE + error.message)
		}
	}

	private defaultProfile(): Profile {
		return {
			name: 'Default',
			color: Color.Red,
			measurement: 'profilerHits',
		}
	}
}