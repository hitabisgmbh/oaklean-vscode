import '../shared/mocks/vscode.mock'
import * as vscode from 'vscode'

import SelectProfileCommand, { CommandIdentifiers } from '../../src/commands/SelectProfile'
import { Container } from '../../src/container'
import EventHandler from '../../src/helper/EventHandler'
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
		const quickPick = await command.execute()
		const selectedOption = quickPick.optionsWithCallBacks.get('Profile 1')
		selectedOption?.selectionCallback()

		expect(container.storage.storeWorkspace).toBeCalled()

		expect(container.storage.storeWorkspace).toHaveBeenCalledWith('profile',
			{
				name: 'Profile 1',
				color: 'Red',
				measurement: 'profilerHits'
			})
	})

	it('should open settings to add a new profile', async () => {
		const quickPick = await command.execute()
		const selectedOption = quickPick.optionsWithCallBacks.get(REQUEST_ADD_NEW_PROFILE)
		selectedOption?.selectionCallback()
		expect(vscode.commands.executeCommand).toHaveBeenCalledWith('oaklean.settings')
	})

	it('should trigger Event when changing profile', async () => {
		const fireProfileChangeSpy = jest.spyOn(eventHandler, 'fireProfileChange')
		const quickPick = await command.execute()
		const selectedOption = quickPick.optionsWithCallBacks.get('Profile 1')
		selectedOption?.selectionCallback()

		expect(fireProfileChangeSpy).toHaveBeenCalledWith(
			{
				'color': 'Red',
				'measurement': 'profilerHits',
				'name': 'Profile 1',
			} as Profile)
	})

	it('should have activeItems', async () => {
		const quickPick = await command.execute()
		const selectedOption = quickPick.optionsWithCallBacks.get('Profile 1')
		selectedOption?.selectionCallback()
		const quickPick2 = await command.execute()
		expect(quickPick2.vsCodeComponent.activeItems).toEqual([{ label: 'Profile 1' }])
	})

})