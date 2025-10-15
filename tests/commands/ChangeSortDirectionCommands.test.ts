import '../shared/mocks/vscode.mock'
import vscode from 'vscode'

import ChangeSortDirectionCommands, { ContextOptions, CommandIdentifiers } from '../../src/commands/ChangeSortDirectionCommands'
import { Container } from '../../src/container'
import { SourceFileMetaDataTreeProvider } from '../../src/treeviews/SourceFileMetaDataTreeProvider'
import { SortDirection } from '../../src/types/sortDirection'
import EventHandler from '../../src/helper/EventHandler'
import ContainerAndStorageMock from '../shared/mocks/ContainerAndStorage.mock'

describe('ChangeSortDirectionCommands', () => {

	let container: Container
	let treeDataProvider: SourceFileMetaDataTreeProvider
	let command: ChangeSortDirectionCommands
	let eventHandler: EventHandler
	beforeEach(() => {
		const containerAndStorageMock = new ContainerAndStorageMock()
		container = containerAndStorageMock.container
		eventHandler = new EventHandler(container)
		treeDataProvider = jest.fn() as unknown as SourceFileMetaDataTreeProvider
	})

	it('should correctly identify itself desc to default', () => {
		command = new ChangeSortDirectionCommands(container, treeDataProvider, SortDirection.default)
		expect(command.getIdentifier()).toBe(CommandIdentifiers.changeSortDirectionDescToDefaultCommand)
	})

	it('should correctly identify itself desc to default', () => {
		command = new ChangeSortDirectionCommands(container, treeDataProvider, SortDirection.asc)
		expect(command.getIdentifier()).toBe(CommandIdentifiers.changeSortDirectionDefaultToAscCommand)
	})

	it('should correctly identify itself desc to default', () => {
		command = new ChangeSortDirectionCommands(container, treeDataProvider, SortDirection.desc)
		expect(command.getIdentifier()).toBe(CommandIdentifiers.changeSortDirectionAscToDescCommand)
	})

	it('should trigger SortDirectionChangeEvent when changing sort direction to asc', () => {

		const sortDirectionChangeEventSpy = jest.spyOn(eventHandler, 'fireSortDirectionChange')
		const sortDirectionChangeSpy = jest.spyOn(vscode.commands, 'executeCommand')

		command = new ChangeSortDirectionCommands(container, treeDataProvider, SortDirection.default)
		command.execute()

		expect(sortDirectionChangeSpy).toHaveBeenCalledWith('setContext', ContextOptions.sortDirectionDefault, false)
		expect(sortDirectionChangeSpy).toHaveBeenCalledWith('setContext', ContextOptions.sortDirectionDesc, false)
		expect(sortDirectionChangeSpy).toHaveBeenCalledWith('setContext', ContextOptions.sortDirectionAsc, true)
		expect(sortDirectionChangeEventSpy).toHaveBeenCalledWith(SortDirection.asc)
	})

	it('should trigger SortDirectionChangeEvent when changing sort direction to desc', () => {

		const sortDirectionChangeEventSpy = jest.spyOn(eventHandler, 'fireSortDirectionChange')
		const sortDirectionChangeSpy = jest.spyOn(vscode.commands, 'executeCommand')
		command = new ChangeSortDirectionCommands(container, treeDataProvider, SortDirection.asc)
		command.execute()

		expect(sortDirectionChangeSpy).toHaveBeenCalledWith('setContext', ContextOptions.sortDirectionDefault, false)
		expect(sortDirectionChangeSpy).toHaveBeenCalledWith('setContext', ContextOptions.sortDirectionDesc, true)
		expect(sortDirectionChangeSpy).toHaveBeenCalledWith('setContext', ContextOptions.sortDirectionAsc, false)
		expect(sortDirectionChangeEventSpy).toHaveBeenCalledWith(SortDirection.desc)
	})

	it('should trigger SortDirectionChangeEvent when changing sort direction to default', () => {
		const sortDirectionChangeEventSpy = jest.spyOn(eventHandler, 'fireSortDirectionChange')
		const sortDirectionChangeSpy = jest.spyOn(vscode.commands, 'executeCommand')

		command = new ChangeSortDirectionCommands(container, treeDataProvider, SortDirection.desc)
		command.execute()

		expect(sortDirectionChangeSpy).toHaveBeenCalledWith('setContext', ContextOptions.sortDirectionDefault, true)
		expect(sortDirectionChangeSpy).toHaveBeenCalledWith('setContext', ContextOptions.sortDirectionDesc, false)
		expect(sortDirectionChangeSpy).toHaveBeenCalledWith('setContext', ContextOptions.sortDirectionAsc, false)
		expect(sortDirectionChangeEventSpy).toHaveBeenCalledWith(SortDirection.default)
	})
})