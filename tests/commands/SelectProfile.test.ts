import '../shared/mocks/vscode.mock'
import '../shared/mocks/profiler-core.mock'
import * as vscode from 'vscode'

import SelectProfileCommand, { CommandIdentifiers } from '../../src/commands/SelectProfile'
import { Container } from '../../src/container'
import EventHandler from '../../src/helper/EventHandler'
import { ERROR_NO_PROFILE_FOUND } from '../../src/constants/infoMessages'
import { REQUEST_ADD_NEW_PROFILE } from '../../src/constants/webview'
import { Profile } from '../../src/types/profile'
import ContainerAndStorageMock from '../shared/mocks/ContainerAndStorage.mock'


describe('SelectProfileCommand', () => {
	let container: Container
	let command: SelectProfileCommand
	let eventHandler: EventHandler
	beforeEach(() => {
		const containerAndStorageMock = new ContainerAndStorageMock()
		container = containerAndStorageMock.container
		eventHandler = new EventHandler(container)
		command = new SelectProfileCommand(container)
	})

	it('should correctly identify itself', () => {
		expect(command.getIdentifier()).toBe(CommandIdentifiers.selectProfile)
	})

	it('should select a profile from the list', async () => {
		(vscode.window.showQuickPick as jest.Mock).mockResolvedValue({ label: 'Profile 1', name: 'Profile 1' })
		await command.execute()
		expect(container.storage.storeWorkspace).toHaveBeenCalledWith('profile',
			{
				name: 'Profile 1',
				color: 'Red',
				measurement: 'profilerHits'
			})
	})

	it('should open settings to add a new profile', async () => {
		(vscode.window.showQuickPick as jest.Mock).mockResolvedValue({ label: REQUEST_ADD_NEW_PROFILE })
		await command.execute()
		expect(vscode.commands.executeCommand).toHaveBeenCalledWith('oaklean.settings')
	})

	it('should throw an error if no profile is found', async () => {
		(vscode.window.showQuickPick as jest.Mock).mockResolvedValue({ label: 'NonExistentProfile', name: 'NonExistentProfile' })
		await expect(command.execute()).rejects.toThrow(ERROR_NO_PROFILE_FOUND)
	})

	it('should trigger Event when changing profile', async () => {
		const fireProfileChangeSpy = jest.spyOn(eventHandler, 'fireProfileChange');
		(vscode.window.showQuickPick as jest.Mock).mockResolvedValue({ label: 'Profile 1', name: 'Profile 1' })

		await command.execute()

		expect(fireProfileChangeSpy).toHaveBeenCalledWith(
			{
				'color': 'Red',
				'measurement': 'profilerHits',
				'name': 'Profile 1',
			} as Profile)
	})

})