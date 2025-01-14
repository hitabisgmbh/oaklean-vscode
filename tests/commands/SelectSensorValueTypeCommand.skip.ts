import '../shared/mocks/vscode.mock'
import '../shared/mocks/profiler-core.mock'
import '../shared/mocks/FormulaHelper.mock'
import * as vscode from 'vscode'

import { Container } from '../../src/container'
import EventHandler from '../../src/helper/EventHandler'
import { SensorValueTypeNames } from '../../src/types/sensorValues'
import { checkFormulaValidity } from '../../src/helper/FormulaHelper'
import SelectValueRepresentationCommand, { CommandIdentifiers } from '../../src/commands/SelectSensorValueTypeCommand'
import { SourceFileMetaDataTreeProvider } from '../../src/treeviews/SourceFileMetaDataTreeProvider'
import ContainerAndStorageMock from '../shared/mocks/ContainerAndStorage.mock'
import { ValueRepresentationType } from '../../src/types/valueRepresentationTypes'
import { SensorValueRepresentation } from '../../src/types/sensorValueRepresentation'

describe('SelectSensorValueTypeCommand', () => {
	let container: Container
	let command: SelectValueRepresentationCommand
	let eventHandler: EventHandler
	let treeDataProvider: SourceFileMetaDataTreeProvider

	beforeEach(() => {
		const containerAndStorageMock = new ContainerAndStorageMock()
		container = containerAndStorageMock.container
		eventHandler = new EventHandler(container)
		treeDataProvider = new SourceFileMetaDataTreeProvider(container)
		command = new SelectValueRepresentationCommand(container, treeDataProvider)
		containerAndStorageMock.setMockStore('sensorValueRepresentation', {
			selectedSensorValueType: 'profilerHits',
			selectedValueRepresentation: ValueRepresentationType.absolute,
			formula: 'previousFormula'
		} satisfies SensorValueRepresentation)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	test('getIdentifier returns the correct identifier', () => {
		expect(command.getIdentifier()).toBe(CommandIdentifiers.selectedSensorValueType)
	})

	it('should execute and change sensor value type to a predefined one', () => {
		const expectedSensorValueRepresentation: SensorValueRepresentation = {
			selectedSensorValueType: 'profilerHits',
			selectedValueRepresentation: ValueRepresentationType.absolute,
			formula: undefined
		}

		const fireSelectedSensorValueTypeChangeSpy = jest.spyOn(eventHandler, 'fireSelectedSensorValueTypeChange')
		const quickPick = command.execute()
		const selectedOption = quickPick.optionsWithCallBacks.get('profilerHits')
		selectedOption?.selectionCallback()
		expect(fireSelectedSensorValueTypeChangeSpy).toHaveBeenCalledWith(expectedSensorValueRepresentation)
		expect(container.storage.storeWorkspace).toHaveBeenCalledWith('sensorValueRepresentation', expectedSensorValueRepresentation)
	})

	it('should change formula if custom formula is selected', async () => {
		const formula = 'aggregatedCPUTime/profilerHits'
		const expectedSensorValueRepresentation: SensorValueRepresentation = {
			selectedSensorValueType: 'customFormula',
			selectedValueRepresentation: ValueRepresentationType.absolute,
			formula: formula
		}
		const fireSelectedSensorValueTypeChangeSpy = jest.spyOn(eventHandler, 'fireSelectedSensorValueTypeChange');
		(vscode.window.showInputBox as jest.Mock).mockResolvedValue(formula);
		(checkFormulaValidity as jest.Mock).mockReturnValue(true)
		const quickPick = command.execute()
		const selectedOption = quickPick.optionsWithCallBacks.get('Add custom formula')
		selectedOption?.selectionCallback()
		await expect(vscode.window.showInputBox).toHaveBeenCalledWith(expect.objectContaining({
			prompt: 'Enter a formula'
		}))
		expect(checkFormulaValidity).toHaveBeenCalledWith(formula)
		expect(container.storage.storeWorkspace).toHaveBeenCalledWith(
			'sensorValueRepresentation',
			expectedSensorValueRepresentation
		)
		expect(fireSelectedSensorValueTypeChangeSpy).toHaveBeenCalledWith(expectedSensorValueRepresentation)
	})

	it('should not change sensor value type if no selection is made', async () => {
		(vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined)

		await command.execute()

		expect(container.storage.storeWorkspace).not.toHaveBeenCalled()
	})

	it('should not change sensor value type if invalid formula is entered', async () => {
		const fireSelectedSensorValueTypeChangeSpy = jest.spyOn(eventHandler, 'fireSelectedSensorValueTypeChange')
		const formula = 'aggregatedCPUTime/WRONG_VAR';
		(vscode.window.showInputBox as jest.Mock).mockResolvedValue(formula);
		(checkFormulaValidity as jest.Mock).mockReturnValue(false)
		const quickPick = command.execute()
		const selectedOption = quickPick.optionsWithCallBacks.get('Add custom formula')
		selectedOption?.selectionCallback()
		await expect(vscode.window.showInputBox).toHaveBeenCalledWith(expect.objectContaining({
			prompt: 'Enter a formula'
		}))
		expect(fireSelectedSensorValueTypeChangeSpy).not.toHaveBeenCalled()
		expect(checkFormulaValidity).toHaveBeenCalledWith(formula)
		expect(container.storage.storeWorkspace).not.toHaveBeenCalled()
	})

	it('should have activeItems', async () => {
		const quickPick = command.execute()
		const selectedOption = quickPick.optionsWithCallBacks.get('profilerHits')
		selectedOption?.selectionCallback()
		const quickPick2 = await command.execute()
		expect(quickPick2.vsCodeComponent.activeItems).toEqual([{ label: 'profilerHits' }])
	})
})