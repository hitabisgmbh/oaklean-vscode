import vscode from 'vscode'

import BaseCommand from './BaseCommand'

import { Container } from '../container'
import { SourceFileMetaDataTreeProvider } from '../treeviews/SourceFileMetaDataTreeProvider'
import { ValueRepresentationType } from '../types/valueRepresentationTypes'
import { SensorValueRepresentation } from '../types/sensorValueRepresentation'

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

const QuickPickOptions_ValueRepresentation: {
	id: ValueRepresentationType,
	label: string
}[] = (Object.keys(ValueRepresentationType) as ValueRepresentationType[]).map((id: ValueRepresentationType) => {
	return {
		id,
		label: ValueRepresentations[id as keyof ValueRepresentationMetaData].label
	}
})

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
	container: Container
	private _treeDataProvider: SourceFileMetaDataTreeProvider

	constructor(container: Container, treeDataProvider: SourceFileMetaDataTreeProvider) {
		super()
		this.container = container
		this._treeDataProvider = treeDataProvider
	}


	getIdentifier(): CommandIdentifiers {
		return CommandIdentifiers.selectValueRepresentation
	}

	execute() {
		vscode.window.showQuickPick(QuickPickOptions_ValueRepresentation)
			.then((selectedRepresentation: { id: ValueRepresentationType, label: string } | undefined) => {
				if (selectedRepresentation) {
					changeRepresentation(this.container, selectedRepresentation.id)
				}
			})
	}
}
