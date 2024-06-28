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

describe('SelectProfileCommand', () => {
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

	it('should execute and change sensor value type to a predefined one', async () => {
		const fireSelectedSensorValueTypeChangeSpy = jest.spyOn(eventHandler, 'fireSelectedSensorValueTypeChange')
		type ValidSensorValueTypeKey = keyof typeof SensorValueTypeNames;
		const mockSensorValueType: { id: ValidSensorValueTypeKey; label: ValidSensorValueTypeKey } =
			{ id: 'profilerHits', label: 'profilerHits' }
			; (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(mockSensorValueType)

		await command.execute()
		expect(fireSelectedSensorValueTypeChangeSpy).toHaveBeenCalledWith(
			{
				selectedSensorValueType: 'profilerHits',
				selectedValueRepresentation: 'absolut',
				formula: undefined
			})
		expect(vscode.window.showQuickPick).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({
			label: SensorValueTypeNames[mockSensorValueType.label]
		})]))
		expect(container.storage.storeWorkspace).toHaveBeenCalledWith('sensorValueRepresentation', { selectedSensorValueType: SensorValueTypeNames[mockSensorValueType.label], selectedValueRepresentation: 'absolut', formula: undefined }
		)
	})

	it('should change formula if custom formula is selected', async () => {
		type ValidSensorValueTypeKey = keyof typeof SensorValueTypeNames;
		const fireSelectedSensorValueTypeChangeSpy = jest.spyOn(eventHandler, 'fireSelectedSensorValueTypeChange')
		const mockSensorValueType: { id: ValidSensorValueTypeKey; label: string } = { id: 'customFormula', label: 'Add custom formula' }
		const mockFormula = 'aggregatedCPUTime/profilerHits';
		(vscode.window.showQuickPick as jest.Mock).mockResolvedValue(mockSensorValueType);
		(vscode.window.showInputBox as jest.Mock).mockResolvedValue(mockFormula);
		(checkFomulaValidity as jest.Mock).mockReturnValue(true)
		await command.execute()
		await expect(vscode.window.showQuickPick).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({
			label: 'Add custom formula'
		})]))
		await expect(vscode.window.showInputBox).toHaveBeenCalledWith(expect.objectContaining({
			prompt: 'Enter a formula'
		}))
		expect(checkFomulaValidity).toHaveBeenCalledWith(mockFormula)
		expect(container.storage.storeWorkspace).toHaveBeenCalledWith('sensorValueRepresentation', { selectedSensorValueType: SensorValueTypeNames[mockSensorValueType.id], selectedValueRepresentation: 'absolut', formula: mockFormula })
		expect(fireSelectedSensorValueTypeChangeSpy).toHaveBeenCalledWith(
			{
				selectedSensorValueType: SensorValueTypeNames[mockSensorValueType.id],
				selectedValueRepresentation: 'absolut', formula: mockFormula
			})
	})

	it('should not change sensor value type if no selection is made', async () => {
		(vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined)

		await command.execute()

		expect(container.storage.storeWorkspace).not.toHaveBeenCalled()
	})

	it('should not change sensor value type if invalid formula is entered', async () => {
		const fireSelectedSensorValueTypeChangeSpy = jest.spyOn(eventHandler, 'fireSelectedSensorValueTypeChange')
		type ValidSensorValueTypeKey = keyof typeof SensorValueTypeNames;
		const mockSensorValueType: { id: ValidSensorValueTypeKey; label: string } = { id: 'customFormula', label: 'Add custom formula' }
		const mockFormula = 'invalidFormula';
		(vscode.window.showQuickPick as jest.Mock).mockResolvedValue(mockSensorValueType);
		(vscode.window.showInputBox as jest.Mock).mockResolvedValue(mockFormula);
		(checkFomulaValidity as jest.Mock).mockReturnValue(false)


		await command.execute()

		await expect(vscode.window.showQuickPick).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({
			label: 'Add custom formula'
		})]))
		await expect(vscode.window.showInputBox).toHaveBeenCalledWith(expect.objectContaining({
			prompt: 'Enter a formula'
		}))
		expect(fireSelectedSensorValueTypeChangeSpy).not.toHaveBeenCalled()
		expect(checkFomulaValidity).toHaveBeenCalledWith(mockFormula)
		expect(container.storage.storeWorkspace).not.toHaveBeenCalled()
	})
})