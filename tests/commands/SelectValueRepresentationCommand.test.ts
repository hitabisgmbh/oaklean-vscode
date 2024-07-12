import '../shared/mocks/vscode.mock'
import '../shared/mocks/profiler-core.mock'

import vscode from 'vscode'

import SelectValueRepresentationCommand, { CommandIdentifiers } from '../../src/commands/SelectValueRepresentationCommand'
import { Container } from '../../src/container'
import { SourceFileMetaDataTreeProvider } from '../../src/treeviews/SourceFileMetaDataTreeProvider'
import { ValueRepresentationType } from '../../src/types/valueRepresentationTypes'
import { stub_createDirectoryTree } from '../shared/mocks/SourceFileMetaDataProvider.mock'
import EventHandler from '../../src/helper/EventHandler'
import ContainerAndStorageMock from '../shared/mocks/ContainerAndStorage.mock'

describe('SelectValueRepresentationCommand', () => {
	stub_createDirectoryTree()
	let command: SelectValueRepresentationCommand
	let container: Container
	let treeDataProvider: SourceFileMetaDataTreeProvider
	let eventHandler: EventHandler
	beforeEach(() => {
		const containerAndStorageMock = new ContainerAndStorageMock()
		container = containerAndStorageMock.container
		eventHandler = new EventHandler(container)
		treeDataProvider = new SourceFileMetaDataTreeProvider(container)
		command = new SelectValueRepresentationCommand(container, treeDataProvider)
		containerAndStorageMock.setMockStore('sensorValueRepresentation', {
			selectedSensorValueType: 'previousSensorValueTypeID',
			selectedValueRepresentation: ValueRepresentationType.absolute,
			formula: 'previousFormula'
		})
	})

	test('getIdentifier returns the correct identifier', () => {
		expect(command.getIdentifier()).toBe(CommandIdentifiers.selectValueRepresentation)
	})

	it('should store the selected value representation when a selection is made', async () => {
		const fireSelectedSensorValueTypeChangeSpy = jest.spyOn(eventHandler, 'fireSelectedSensorValueTypeChange')
		const quickPick = await command.execute()
		const selectedOption = quickPick.optionsWithCallBacks.get('Absolute values')
		selectedOption?.selectionCallback()
		expect(container.storage.storeWorkspace).toHaveBeenCalledWith('sensorValueRepresentation', {
			selectedSensorValueType: 'previousSensorValueTypeID',
			selectedValueRepresentation: ValueRepresentationType.absolute,
			formula: 'previousFormula',
		})

		expect(fireSelectedSensorValueTypeChangeSpy).toHaveBeenCalledWith(
			{
				selectedSensorValueType: 'previousSensorValueTypeID',
				selectedValueRepresentation: ValueRepresentationType.absolute,
				formula: 'previousFormula',
			})
	})

	it('should not change representation if no selection is made', async () => {
		await command.execute()

		expect(container.storage.storeWorkspace).not.toHaveBeenCalled()
	})

	it('should have activeItems', async () => {
		const quickPick = command.execute()
		const selectedOption = quickPick.optionsWithCallBacks.get('Absolute values')
		selectedOption?.selectionCallback()
		const quickPick2 = await command.execute()
		expect(quickPick2.vsCodeComponent.activeItems).toEqual([{ label: 'Absolute values' }])
	})

})