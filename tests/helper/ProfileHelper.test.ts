import fs from 'fs'

import { UnifiedPath } from '@oaklean/profiler-core/dist/src/system/UnifiedPath'
import vscode, { Disposable } from 'vscode'

import { Color } from '../../src/types/color'
import { Profile } from '../../src/types/profile'
import ProfileHelper from '../../src/helper/ProfileHelper'
import { ERROR_FAILED_TO_SAVE_PROFILE, ERROR_NO_PROFILE, ERROR_NO_PROFILE_FOUND } from '../../src/constants/infoMessages'
import { Container } from '../../src/container'
import { WORKSPACE_PATH } from '../shared/constants/app'
import { stub_ProfilerConfig } from '../shared/mocks/ProfilerConfig.mock'
import { stub_globSync, stub_getWorkspaceDirStub } from '../shared/mocks/WorkspaceUtils.mock'
import { ProfileChangeEvent } from '../../src/helper/EventHandler'
import { stub_readProfiles, stub_returnSettingsPath } from '../shared/mocks/ProfileHelper.mock'

jest.mock('fs', () => ({
	...jest.requireActual('fs'),
	mkdirSync: jest.fn(),
}))

jest.mock('vscode', () => ({
	Disposable: {
		from: jest.fn().mockImplementation(() => ({
			dispose: jest.fn(),
		})),
	},
	window: {
		showErrorMessage: jest.fn(),
	}
}), { virtual: true })

jest.mock('../../src/container', () => ({
	Container: jest.fn().mockImplementation(() => ({
		eventHandler: {
			onProfileChange: jest.fn().mockImplementation(
				(listener: (e: ProfileChangeEvent) => any, thisArgs?: any, disposables?: Disposable[]) => {
					return {
						dispose: jest.fn()
					} as vscode.Disposable
				}),
		},
	})),
}), { virtual: true })

describe('ProfileHelper', () => {
	let profileHelper: ProfileHelper
	let container: Container
	let storage: any
	stub_ProfilerConfig()
	stub_globSync()
	stub_getWorkspaceDirStub()
	stub_readProfiles()
	stub_returnSettingsPath()
	beforeEach(() => {
		storage = {
			onDidChange: jest.fn(),
			getWorkspace: jest.fn()
		}

		container = {
			storage,
			eventHandler: {
				onProfileChange: jest.fn().mockImplementation(
					(listener: (e: ProfileChangeEvent) => any, thisArgs?: any, disposables?: Disposable[]) => {
						return {
							dispose: jest.fn()
						} as vscode.Disposable
					}),
			}
		} as unknown as Container
		profileHelper = new ProfileHelper(container)
	})

	it('should initialize correctly', () => {
		expect(profileHelper).toBeInstanceOf(ProfileHelper)
	})


	it('should read profiles from settings file', () => {
		const result = profileHelper.readProfiles()
		expect(result).toEqual({
			profiles: [{ name: 'Profile 1', color: 'Red', measurement: 'profilerHits' }]
		})
	})

	it('should add a profile', () => {
		const profile = { name: 'Profile 2', color: Color.Red, measurement: 'profilerHits' } as Profile
		const readProfilesSpy = jest.spyOn(profileHelper, 'readProfiles').mockReturnValueOnce({
			profiles: []
		})
		const writeProfilesSpy = jest.spyOn(profileHelper, 'writeProfiles')
		const result = profileHelper.addProfile(profile)
		expect(result).toBe(true)
		expect(readProfilesSpy).toHaveBeenCalled()
		expect(writeProfilesSpy).toHaveBeenCalledWith([{ name: 'Profile 2', color: Color.Red, measurement: 'profilerHits' }])
	})

	it('should not add a profile if it already exists', () => {
		const profile = { name: 'Profile 1', color: Color.Red, measurement: 'profilerHits' } as Profile
		const readProfilesSpy = jest.spyOn(profileHelper, 'readProfiles')
		const writeProfilesSpy = jest.spyOn(profileHelper, 'writeProfiles')
		const t = () => {
			profileHelper.addProfile(profile)
		}
		expect(t).toThrowError('A profile with the same name already exists.')
		expect(readProfilesSpy).toHaveBeenCalled()
		expect(writeProfilesSpy).not.toHaveBeenCalled()
	})

	it('should update a profile', () => {
		const updatedProfile = { name: 'Profile 1', color: Color.Blue, measurement: 'aggregatedCPUTime' } as Profile
		const readProfilesSpy = jest.spyOn(profileHelper, 'readProfiles')
		const writeProfilesSpy = jest.spyOn(profileHelper, 'writeProfiles')
		profileHelper.updateProfile(updatedProfile)
		expect(readProfilesSpy).toHaveBeenCalled()
		expect(writeProfilesSpy).toHaveBeenCalledWith([updatedProfile])
	})

	it('should show an error message when updating a non-existing profile', () => {
		const updatedProfile = { name: 'Profile 2', color: Color.Blue, measurement: 'aggregatedCPUTime' } as Profile
		const readProfilesSpy = jest.spyOn(profileHelper, 'readProfiles')
		const writeProfilesSpy = jest.spyOn(profileHelper, 'writeProfiles')
		const showErrorMessageSpy = jest.spyOn(vscode.window, 'showErrorMessage')
		profileHelper.updateProfile(updatedProfile)
		expect(readProfilesSpy).toHaveBeenCalled()
		expect(writeProfilesSpy).not.toHaveBeenCalled()
		expect(showErrorMessageSpy).toHaveBeenCalledWith(ERROR_NO_PROFILE_FOUND)
	})

	it('should delete a profile', () => {
		const profileName = 'Profile 1'
		const readProfilesSpy = jest.spyOn(profileHelper, 'readProfiles')
		const writeProfilesSpy = jest.spyOn(profileHelper, 'writeProfiles')
		profileHelper.deleteProfile(profileName)
		expect(readProfilesSpy).toHaveBeenCalled()
		expect(writeProfilesSpy).toHaveBeenCalledWith([])
	})

	it('should show an error message when deleting a non-existing profile', () => {
		const profileName = 'Profile 2'
		const readProfilesSpy = jest.spyOn(profileHelper, 'readProfiles')
		const writeProfilesSpy = jest.spyOn(profileHelper, 'writeProfiles')
		const showErrorMessageSpy = jest.spyOn(vscode.window, 'showErrorMessage')
		profileHelper.deleteProfile(profileName)
		expect(readProfilesSpy).toHaveBeenCalled()
		expect(writeProfilesSpy).not.toHaveBeenCalled()
		expect(showErrorMessageSpy).toHaveBeenCalledWith(ERROR_NO_PROFILE)
	})

	it('should create settings file and write profiles', () => {
		const settingsPath = new UnifiedPath(WORKSPACE_PATH + '.vscode/settings.json')
		const returnSettingsPathSpy = jest.spyOn(profileHelper, 'returnSettingsPath').mockReturnValueOnce(settingsPath)
		const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false)
		const mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync')
		const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync')
		profileHelper.writeProfiles([{ name: 'Profile 1', color: Color.Blue, measurement: 'aggregatedCPUTime' },
		{ name: 'Profile 2', color: Color.Blue, measurement: 'aggregatedCPUTime' }])
		expect(returnSettingsPathSpy).toHaveBeenCalled()
		expect(existsSyncSpy).toHaveBeenCalledWith(settingsPath.toPlatformString())
		expect(mkdirSyncSpy).toHaveBeenCalledWith(settingsPath.dirName().toPlatformString(), { recursive: true })
		const expectedJson = JSON.parse('{"oaklean.Profiles": [{"name": "Profile 1","color": "Blue","measurement": "aggregatedCPUTime"},{"name": "Profile 2","color": "Blue","measurement": "aggregatedCPUTime"}]}')
		const actualJson = JSON.parse(writeFileSyncSpy.mock.calls[0][1].toString())
		expect(actualJson).toEqual(expectedJson)
	})

	it('should show an error message when failed to save profiles', () => {
		const settingsPath = new UnifiedPath(WORKSPACE_PATH + '.vscode/settings.json')
		const returnSettingsPathSpy = jest.spyOn(profileHelper, 'returnSettingsPath').mockReturnValueOnce(settingsPath)
		const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValueOnce(true)
		const writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
			throw new Error('Failed to save profiles')
		})
		const showErrorMessageSpy = jest.spyOn(vscode.window, 'showErrorMessage')
		profileHelper.writeProfiles([{ name: 'Profile 1', color: Color.Blue, measurement: 'aggregatedCPUTime' },
		{ name: 'Profile 2', color: Color.Blue, measurement: 'aggregatedCPUTime' }])
		expect(returnSettingsPathSpy).toHaveBeenCalled()
		expect(existsSyncSpy).toHaveBeenCalledWith(settingsPath.toPlatformString())
		expect(writeFileSyncSpy).toHaveBeenCalled()
		expect(showErrorMessageSpy).toHaveBeenCalledWith(ERROR_FAILED_TO_SAVE_PROFILE)
	})
})