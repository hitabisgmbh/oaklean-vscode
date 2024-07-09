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

const QuickPickOptions_ValueRepresentation: Map<ValueRepresentationType, string> = new Map(
	(Object.keys(ValueRepresentationType) as ValueRepresentationType[]).map((id: ValueRepresentationType) => {
		return [id, ValueRepresentations[id as keyof ValueRepresentationMetaData].label]
	})
)

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
		const quickPickOptions: QuickPickOptions = new Map()
		for (const option of QuickPickOptions_ValueRepresentation) {
			quickPickOptions.set(option[1], {
				selectionCallback: () => {
					if (option[0]) {
						changeRepresentation(this.container, option[0])
					}
				}
			})
		}

		const currentSensorValueRepresentation = this.container.storage.getWorkspace('sensorValueRepresentation') as SensorValueRepresentation
		const currentlySelectedLabel = QuickPickOptions_ValueRepresentation.get(
			currentSensorValueRepresentation.selectedValueRepresentation)
		const quickPick = new QuickPick(quickPickOptions)
		const currentItem = quickPick.vsCodeComponent.items.find(item => item.label === currentlySelectedLabel)

		if (currentItem) {
			quickPick.vsCodeComponent.activeItems = [currentItem]
		}
		quickPick.show()
	}
}
