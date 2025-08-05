import * as vscode from 'vscode'

import BaseCommand from './BaseCommand'

import { Container } from '../container'
import { SourceFileMetaDataTreeProvider } from '../treeviews/SourceFileMetaDataTreeProvider'
import { ValueRepresentationType } from '../types/valueRepresentationTypes'
import { SensorValueRepresentation } from '../types/sensorValueRepresentation'
import QuickPick, { QuickPickOptions } from '../components/QuickPick'

type ValueRepresentationMetaData = {
	[key in ValueRepresentationType]: {
		label: string
	};
};

const ValueRepresentations: ValueRepresentationMetaData = {
	[ValueRepresentationType.absolute]: {
		label: 'Absolute values'
	},
	[ValueRepresentationType.locallyRelative]: {
		label: 'Locally relative values (relative to the current hierarchy level such as the folder level)'
	},
	[ValueRepresentationType.totalRelative]: {
		label: 'Total relative values (relative to the total sum in the project)'
	}
}

function changeRepresentation(container: Container, selectedValueRepresentationID: ValueRepresentationType) {
	const sensorValueRepresentation = container.storage.getWorkspace('sensorValueRepresentation') as SensorValueRepresentation
	container.storage.storeWorkspace('sensorValueRepresentation', {
		selectedSensorValueType: sensorValueRepresentation.selectedSensorValueType,
		selectedValueRepresentation: selectedValueRepresentationID,
		formula: sensorValueRepresentation.formula
	})
}

export enum CommandIdentifiers {
	selectValueRepresentation = 'selectValueRepresentation',
	selectedSensorValueType = 'selectedSensorValueType',

}

export default class SelectValueRepresentationCommand extends BaseCommand {
	private _disposable: vscode.Disposable
	container: Container
	private _treeDataProvider: SourceFileMetaDataTreeProvider

	constructor(container: Container, treeDataProvider: SourceFileMetaDataTreeProvider) {
		super()
		this.container = container
		this._treeDataProvider = treeDataProvider
		this._disposable = vscode.Disposable.from()
	}

	dispose() {
		this._disposable.dispose()
	}

	getIdentifier(): CommandIdentifiers {
		return CommandIdentifiers.selectValueRepresentation
	}

	execute() {
		const quickPickOptions: QuickPickOptions = new Map()
		quickPickOptions.set(ValueRepresentations.absolute.label, {
			selectionCallback: () => {
				changeRepresentation(this.container, ValueRepresentationType.absolute)
			}
		})
		quickPickOptions.set(ValueRepresentations.locallyRelative.label, {
			selectionCallback: () => {
				changeRepresentation(this.container, ValueRepresentationType.locallyRelative)
			}
		})
		quickPickOptions.set(ValueRepresentations.totalRelative.label, {
			selectionCallback: () => {
				changeRepresentation(this.container, ValueRepresentationType.totalRelative)
			}
		})

		const currentSensorValueRepresentation = this.container.storage.getWorkspace('sensorValueRepresentation') as SensorValueRepresentation
		const currentlySelectedLabel =
			ValueRepresentations[currentSensorValueRepresentation.selectedValueRepresentation].label
		const quickPick = new QuickPick(quickPickOptions)
		if (currentlySelectedLabel) {
			quickPick.setCurrentItem(currentlySelectedLabel)
		}

		quickPick.show()
		return quickPick
	}
}
