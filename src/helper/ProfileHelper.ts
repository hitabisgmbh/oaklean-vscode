import * as fs from 'fs'

import { jsonc } from 'jsonc'
import { UnifiedPath } from '@oaklean/profiler-core'
import vscode, { Disposable } from 'vscode'

import WorkspaceUtils from './WorkspaceUtils'

import { Profile } from '../types/profile'
import { ERROR_FAILED_TO_SAVE_PROFILE, ERROR_NO_PROFILE, ERROR_NO_PROFILE_FOUND } from '../constants/infoMessages'
import { Container } from '../container'
import { PROFILE_IDENTIFIER } from '../constants/webview'
import { ProfileChangeEvent } from '../helper/EventHandler'
import { SensorValueRepresentation } from '../types/sensorValueRepresentation'


export default class ProfileHelper implements Disposable {
	private readonly _disposable: Disposable
	private container: Container
	constructor(container: Container) {
		this._disposable = Disposable.from()
		this.container = container
		this.container.eventHandler.onProfileChange(this.profileChanges.bind(this))
	}
	get profiles(): Profile[] {
		const result = this.readProfiles()
		if (result.error) {
			vscode.window.showErrorMessage(result.error)
			return []
		}
		return result.profiles
	}
	get currentProfile(): Profile | undefined {
		return this.container.storage.getWorkspace('profile') as Profile | undefined
	}

	private profileChanges(event: ProfileChangeEvent) {
		const sensorValueRepresentation = this.container.storage.getWorkspace('sensorValueRepresentation') as SensorValueRepresentation
		this.container.storage.storeWorkspace('sensorValueRepresentation', {
			selectedSensorValueType: event.profile.measurement,
			selectedValueRepresentation: sensorValueRepresentation.selectedValueRepresentation,
			formula: event.profile.formula
		})
	}

	dispose() {
		this._disposable.dispose()
	}
	returnSettingsPath(): UnifiedPath | undefined {
		const workspaceFolder = WorkspaceUtils.getWorkspaceDir()
		return workspaceFolder?.join('.vscode', 'settings.json')
	}
	readProfiles(): {
		profiles: Profile[],
		error?: string
	} {
		const settingsPath = this.returnSettingsPath()
		if (settingsPath !== undefined) {
			if (fs.existsSync(settingsPath.toPlatformString())) {
				const content = fs.readFileSync(settingsPath.toPlatformString(), 'utf8')
				try {
					const settings = jsonc.parse(content)
					const profiles: Profile[] = settings[PROFILE_IDENTIFIER] || []
					return {
						profiles
					}
				} catch (error) {
					return {
						profiles: [],
						error: `Failed to parse settings file: ${settingsPath}, check if the file is valid JSON.`
					}
				}
			}
		}
		return {
			profiles: []
		}
	}

	addProfile(profile: Profile): boolean {
		const profiles = this.profiles
		if (profiles.some(p => p.name === profile.name)) {
			return false
		}
		profiles.push(profile)
		this.writeProfiles(profiles)
		return true
	}
	updateProfile(updatedProfile: Profile) {
		const profiles = this.profiles
		const index = profiles.findIndex(p => p.name === updatedProfile.name)
		if (index === -1) {
			vscode.window.showErrorMessage(ERROR_NO_PROFILE_FOUND)
			return
		}
		profiles[index] = updatedProfile
		this.writeProfiles(profiles)
	}
	deleteProfile(profileName: string) {
		const profiles = this.profiles
		const filteredProfiles = profiles.filter(p => p.name !== profileName)
		if (filteredProfiles.length === profiles.length) {
			vscode.window.showErrorMessage(ERROR_NO_PROFILE)
			return
		}
		this.writeProfiles(filteredProfiles)
	}
	writeProfiles(profiles: Profile[]) {
		try {
			const settingsPath = this.returnSettingsPath()
			if (settingsPath !== undefined) {
				let settings: any = {}
				if (!fs.existsSync(settingsPath.dirName().toPlatformString())) {
					fs.mkdirSync(settingsPath.dirName().toPlatformString(), { recursive: true })
				}
				if (fs.existsSync(settingsPath.toPlatformString())) {
					settings = jsonc.parse(fs.readFileSync(settingsPath.toPlatformString(), 'utf8').toString())
				}
				settings[PROFILE_IDENTIFIER] = profiles
				fs.writeFileSync(settingsPath.toPlatformString(), jsonc.stringify(settings, undefined, 2))
			}
		} catch (error) {
			vscode.window.showErrorMessage(ERROR_FAILED_TO_SAVE_PROFILE)
		}
	}

}