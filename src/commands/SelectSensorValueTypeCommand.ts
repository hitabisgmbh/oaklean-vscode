import vscode from 'vscode'

import BaseCommand from './BaseCommand'

import { Container } from '../container'
import { SensorValueTypeNames } from '../types/sensorValues'
import { SourceFileMetaDataTreeProvider } from '../treeviews/SourceFileMetaDataTreeProvider'
import { ExtendedSensorValueType } from '../types/sensorValues'
import { checkFomulaValidity } from '../helper/FormulaHelper'
import { SensorValueRepresentation } from '../types/sensorValueRepresentation'
import QuickPick, { QuickPickOptions } from '../components/QuickPick'


const QuickPickOptions_SensorValueTypes = new Map<ExtendedSensorValueType, string>(
	([...Object.keys(SensorValueTypeNames)] as ExtendedSensorValueType[])
		.map((id: ExtendedSensorValueType) => {
			const label = id === 'customFormula' ? 'Add custom formula' : SensorValueTypeNames[id]
			return [id, label]
		})
)

function changeSensorValueType(container: Container, treeDataProvider: SourceFileMetaDataTreeProvider, 
	selectedSensorValueTypeID: ExtendedSensorValueType,
	formula: string | undefined) {
	
	const sensorValueRepresentation = container.storage.getWorkspace('sensorValueRepresentation') as SensorValueRepresentation
	container.storage.storeWorkspace('sensorValueRepresentation', { 
		selectedSensorValueType: selectedSensorValueTypeID, 
		selectedValueRepresentation: sensorValueRepresentation.selectedValueRepresentation, 
		formula})
}

export enum CommandIdentifiers {
	selectedSensorValueType = 'selectedSensorValueType',

}

export default class SelectValueRepresentationCommand extends BaseCommand {
	container: Container
	private _treeDataProvider: SourceFileMetaDataTreeProvider

	constructor(container: Container, treeDataProvider: SourceFileMetaDataTreeProvider ) {
		super()
		this.container = container
		this._treeDataProvider = treeDataProvider
	}


	getIdentifier(): CommandIdentifiers {
		return CommandIdentifiers.selectedSensorValueType
	}

	execute() {
		const quickPickOptions: QuickPickOptions = new Map()
		for (const option of QuickPickOptions_SensorValueTypes) {
			quickPickOptions.set(option[1], {
				selectionCallback: () => {
					if (option[0] === 'customFormula') {
						const sensorValueRepresentation = this.container.storage.getWorkspace('sensorValueRepresentation') as SensorValueRepresentation

						const formula = sensorValueRepresentation.formula
						vscode.window.showInputBox({
							prompt: 'Enter a formula',
							placeHolder: 'e.g., aggregatedCPUTime/profilerHits',
							value: formula
						}).then((formula: string | undefined) => {
							if (formula) {
								if (!checkFomulaValidity(formula)) {
									return
								}
								changeSensorValueType(this.container, this._treeDataProvider,
									option[0], formula)
							}
						})
					} else if (option[0]) {
						changeSensorValueType(this.container, this._treeDataProvider,
							option[0], undefined)
					}
				}
			})
		}
		const currentSensorValueRepresentation = this.container.storage.getWorkspace('sensorValueRepresentation') as SensorValueRepresentation
		const currentlySelectedLabel = QuickPickOptions_SensorValueTypes.get(
			currentSensorValueRepresentation.selectedSensorValueType)
		const quickPick = new QuickPick(quickPickOptions)
		if (currentlySelectedLabel) {
			quickPick.setCurrentItem(currentlySelectedLabel)
		}

		quickPick.show()
		return quickPick
	}
}
