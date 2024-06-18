import vscode from 'vscode'

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
		const placeholder = `Select Project Report (${quickPickOptions.size} Report${quickPickOptions.size > 1 ? 's' : ''} Available)`
		const quickPick = new QuickPick(quickPickOptions, placeholder)
		if (quickPickOptions.size === 0) {
			vscode.window.showInformationMessage('Oaklean: No Project Reports Available')
			return
		}
		quickPick.show()
	}
}