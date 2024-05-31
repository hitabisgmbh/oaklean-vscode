import BaseCommand from './BaseCommand'

import { Container } from '../container'
import WorkspaceUtils from '../helper/WorkspaceUtils'
import QuickPick, { QuickPickOptions } from '../components/QuickPick'

export enum CommandIdentifiers {
	selectReport = 'selectReport'
}

export default class SelectReport extends BaseCommand {
	container: Container
	
	constructor(container: Container) {
		super()
		this.container = container
	}

	getIdentifier(): CommandIdentifiers {
		return CommandIdentifiers.selectReport
	}

	execute() {
		const reportFilePaths = WorkspaceUtils.getProjectReportFromWorkspace()
		const quickPickOptions: QuickPickOptions = new Map()

		for (const reportFilePath of reportFilePaths) {
			quickPickOptions.set(reportFilePath, {
				selectionCallback: () => {
					const reportPath = WorkspaceUtils.getWorkspaceDir()?.join(reportFilePath)
					if (reportPath) {
						this.container.storage.storeWorkspace('reportPath', reportPath)
					}
				}
			})
		}
		const quickPick = new QuickPick(quickPickOptions)
		quickPick.show()
	}
}