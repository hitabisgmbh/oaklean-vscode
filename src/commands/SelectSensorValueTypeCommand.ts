import vscode from 'vscode'

import BaseCommand from './BaseCommand'

import { Container } from '../container'
import { SensorValueTypeNames } from '../types/sensorValues'
import { SourceFileMetaDataTreeProvider } from '../treeviews/SourceFileMetaDataTreeProvider'
import { ExtendedSensorValueType } from '../types/sensorValues'
import { checkFomulaValidity } from '../helper/FormulaHelper'
import { SensorValueRepresentation } from '../types/sensorValueRepresentation'


const QuickPickOptions_SensorValueTypes: {
	id: ExtendedSensorValueType,
	label: string
}[] = ([...Object.keys(SensorValueTypeNames)] as ExtendedSensorValueType[])
	.map((id: ExtendedSensorValueType) => {
		const label = id === 'customFormula' ? 'Add custom formula' : SensorValueTypeNames[id]
		
		return {
			id,
			label
		}
	})

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
		vscode.window.showQuickPick(QuickPickOptions_SensorValueTypes)
			.then((selectedSensorValueType: { id: ExtendedSensorValueType, label: string } | undefined) => {
				if (selectedSensorValueType && selectedSensorValueType.id === 'customFormula') {
					const sensorValueRepresentation = this.container.storage.getWorkspace('sensorValueRepresentation') as SensorValueRepresentation

					const formula = sensorValueRepresentation.formula
					vscode.window.showInputBox({
						prompt: 'Enter a formula',
						placeHolder: 'e.g., aggregatedCPUTime/profilerHits',
						value: formula
					}).then((formula: string | undefined) => {
						if (formula) {
							if (!checkFomulaValidity(formula)){
								return
							}
							changeSensorValueType(this.container, this._treeDataProvider, 
								selectedSensorValueType.id, formula)
						}
					})
				} else if (selectedSensorValueType) {
					changeSensorValueType(this.container, this._treeDataProvider, 
						selectedSensorValueType.id, undefined)
				}
			})
	}
}
