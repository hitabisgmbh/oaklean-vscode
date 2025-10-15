import '../shared/mocks/vscode.mock'
import '../shared/mocks/profiler-core.mock'
import vscode from 'vscode'

import ToggleLineAnnotationCommands, { ToggleLineAnnotationAction, CommandIdentifiers, ContextOptions } from '../../src/commands/ToggleLineAnnotationCommands'
import { Container } from '../../src/container'
import EventHandler from '../../src/helper/EventHandler'
import ContainerAndStorageMock from '../shared/mocks/ContainerAndStorage.mock'



describe('ToggleLineAnnotationCommands', () => {
	let container: Container
	let eventHandler: EventHandler
	beforeEach(() => {
		const containerAndStorageMock = new ContainerAndStorageMock()
		container = containerAndStorageMock.container
		eventHandler = new EventHandler(container)
	})

	it('should return the correct identifier for disable action', () => {
		const command = new ToggleLineAnnotationCommands(container, ToggleLineAnnotationAction.disable)
		expect(command.getIdentifier()).toEqual(CommandIdentifiers.disableLineAnnotations)
	})

	it('should return the correct identifier for enable action', () => {
		const command = new ToggleLineAnnotationCommands(container, ToggleLineAnnotationAction.enable)
		expect(command.getIdentifier()).toEqual(CommandIdentifiers.enableLineAnnotations)
	})

	it('should disable line annotations', async () => {
		const fireToggleLineAnnotationsChangeSpy = jest.spyOn(eventHandler, 'fireToggleLineAnnotationsChange')
		const command = new ToggleLineAnnotationCommands(container, ToggleLineAnnotationAction.disable)
		await command.execute()
		expect(container.storage.storeWorkspace).toHaveBeenCalledWith('enableLineAnnotations', false)
		expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', ContextOptions.lineAnnotationsEnabled, false)
		expect(fireToggleLineAnnotationsChangeSpy).toHaveBeenCalledWith(false)
	})

	it('should enable line annotations', async () => {
		const fireToggleLineAnnotationsChangeSpy = jest.spyOn(eventHandler, 'fireToggleLineAnnotationsChange')
		const command = new ToggleLineAnnotationCommands(container, ToggleLineAnnotationAction.enable)
		await command.execute()
		expect(container.storage.storeWorkspace).toHaveBeenCalledWith('enableLineAnnotations', true)
		expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', ContextOptions.lineAnnotationsEnabled, true)
		expect(fireToggleLineAnnotationsChangeSpy).toHaveBeenCalledWith(true)
	})
})