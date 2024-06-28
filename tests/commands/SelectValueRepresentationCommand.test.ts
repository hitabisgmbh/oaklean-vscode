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
			selectedValueRepresentation: 'absolut',
			formula: 'previousFormula'
		})
	})

	test('getIdentifier returns the correct identifier', () => {
		expect(command.getIdentifier()).toBe(CommandIdentifiers.selectValueRepresentation)
	})

	it('should call showQuickPick with correct options', async () => {
		(vscode.window.showQuickPick as jest.Mock).mockResolvedValue({ id: ValueRepresentationType.absolute, label: 'Absolute values' })
		await command.execute()
		expect(vscode.window.showQuickPick).toHaveBeenCalledWith(expect.arrayContaining([
			expect.objectContaining({ label: 'Absolute values' }),
			expect.objectContaining({ label: 'Locally relative values (relative to the current hierarchy level such as the folder level)' }),
			expect.objectContaining({ label: 'Total relative values (relative to the total sum in the project)' }),
		]))
	})

	it('should store the selected value representation when a selection is made', async () => {
		const fireSelectedSensorValueTypeChangeSpy = jest.spyOn(eventHandler, 'fireSelectedSensorValueTypeChange');
		(vscode.window.showQuickPick as jest.Mock).mockResolvedValue({ id: ValueRepresentationType.absolute, label: 'Absolute values' });
		(container.storage.getWorkspace as jest.Mock).mockReturnValue({ selectedSensorValueType: 'previousSensorValueTypeID', selectedValueRepresentation: ValueRepresentationType.absolute, formula: 'previousFormula' })

		await command.execute()

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
		(vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined)

		await command.execute()

		expect(container.storage.storeWorkspace).not.toHaveBeenCalled()
	})

})