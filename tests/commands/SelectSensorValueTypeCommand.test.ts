import '../shared/mocks/vscode.mock'
import '../shared/mocks/profiler-core.mock'
import '../shared/mocks/FormulaHelper.mock'
import * as vscode from 'vscode'

import { Container } from '../../src/container'
import EventHandler from '../../src/helper/EventHandler'
import { SensorValueTypeNames } from '../../src/types/sensorValues'
import { checkFomulaValidity } from '../../src/helper/FormulaHelper'
import SelectValueRepresentationCommand, { CommandIdentifiers } from '../../src/commands/SelectSensorValueTypeCommand'
import { SourceFileMetaDataTreeProvider } from '../../src/treeviews/SourceFileMetaDataTreeProvider'
import ContainerAndStorageMock from '../shared/mocks/ContainerAndStorage.mock'

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
			selectedSensorValueType: 'previousSensorValueTypeID',
			selectedValueRepresentation: 'absolut',
			formula: 'previousFormula'
		})
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	test('getIdentifier returns the correct identifier', () => {
		expect(command.getIdentifier()).toBe(CommandIdentifiers.selectedSensorValueType)
	})

	it('should execute and change sensor value type to a predefined one', () => {
		const fireSelectedSensorValueTypeChangeSpy = jest.spyOn(eventHandler, 'fireSelectedSensorValueTypeChange')
		type ValidSensorValueTypeKey = keyof typeof SensorValueTypeNames;
		const mockSensorValueType: { id: ValidSensorValueTypeKey; label: ValidSensorValueTypeKey } =
			{ id: 'profilerHits', label: 'profilerHits' }

		const quickPick = command.execute()
		const selectedOption = quickPick.optionsWithCallBacks.get('profilerHits')
		selectedOption?.selectionCallback()
		expect(fireSelectedSensorValueTypeChangeSpy).toHaveBeenCalledWith(
			{
				selectedSensorValueType: 'profilerHits',
				selectedValueRepresentation: 'absolut',
				formula: undefined
			})

		expect(container.storage.storeWorkspace).toHaveBeenCalledWith('sensorValueRepresentation', { 
			selectedSensorValueType: SensorValueTypeNames[mockSensorValueType.label], selectedValueRepresentation: 'absolut', formula: undefined }
			
		)
	})

	it('should change formula if custom formula is selected', async () => {
		type ValidSensorValueTypeKey = keyof typeof SensorValueTypeNames;
		const fireSelectedSensorValueTypeChangeSpy = jest.spyOn(eventHandler, 'fireSelectedSensorValueTypeChange')
		const formulaSensorValueType: { id: ValidSensorValueTypeKey; label: string } = { id: 'customFormula', label: 'Add custom formula' }
		const formula = 'aggregatedCPUTime/profilerHits';
		(vscode.window.showInputBox as jest.Mock).mockResolvedValue(formula);
		(checkFomulaValidity as jest.Mock).mockReturnValue(true)
		const quickPick = command.execute()
		const selectedOption = quickPick.optionsWithCallBacks.get(formulaSensorValueType.label)
		selectedOption?.selectionCallback()
		await expect(vscode.window.showInputBox).toHaveBeenCalledWith(expect.objectContaining({
			prompt: 'Enter a formula'
		}))
		expect(checkFomulaValidity).toHaveBeenCalledWith(formula)
		expect(container.storage.storeWorkspace).toHaveBeenCalledWith('sensorValueRepresentation', 
			{ selectedSensorValueType: SensorValueTypeNames[formulaSensorValueType.id], selectedValueRepresentation: 'absolut', formula: formula })
		expect(fireSelectedSensorValueTypeChangeSpy).toHaveBeenCalledWith(
			{
				selectedSensorValueType: SensorValueTypeNames[formulaSensorValueType.id],
				selectedValueRepresentation: 'absolut', formula: formula
			})
	})

	it('should not change sensor value type if no selection is made', async () => {
		(vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined)

		await command.execute()

		expect(container.storage.storeWorkspace).not.toHaveBeenCalled()
	})

	it('should not change sensor value type if invalid formula is entered', async () => {
		type ValidSensorValueTypeKey = keyof typeof SensorValueTypeNames;
		const fireSelectedSensorValueTypeChangeSpy = jest.spyOn(eventHandler, 'fireSelectedSensorValueTypeChange')
		const formulaSensorValueType: { id: ValidSensorValueTypeKey; label: string } = { id: 'customFormula', label: 'Add custom formula' }
		const formula = 'aggregatedCPUTime/WRONG_VAR';
		(vscode.window.showInputBox as jest.Mock).mockResolvedValue(formula);
		(checkFomulaValidity as jest.Mock).mockReturnValue(false)
		const quickPick = command.execute()
		const selectedOption = quickPick.optionsWithCallBacks.get(formulaSensorValueType.label)
		selectedOption?.selectionCallback()
		await expect(vscode.window.showInputBox).toHaveBeenCalledWith(expect.objectContaining({
			prompt: 'Enter a formula'
		}))
		expect(fireSelectedSensorValueTypeChangeSpy).not.toHaveBeenCalled()
		expect(checkFomulaValidity).toHaveBeenCalledWith(formula)
		expect(container.storage.storeWorkspace).not.toHaveBeenCalled()
	})
})