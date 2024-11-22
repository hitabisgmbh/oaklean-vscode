import vscode from 'vscode'
import { UnifiedPath } from '@oaklean/profiler-core'

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
		const reportFilePaths = WorkspaceUtils.getProjectReportPathsFromWorkspace()
		const quickPickOptions: QuickPickOptions = new Map()
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (workspaceDir === undefined) {
			vscode.window.showInformationMessage('Oaklean: No Workspace Opened')
			return
		}
		for (const reportFilePath of reportFilePaths) {
			quickPickOptions.set(workspaceDir.pathTo(reportFilePath).toString(), {
				selectionCallback: () => {
					this.container.storage.storeWorkspace('reportPath', reportFilePath)
				}
			})
		}
		const placeholder = `Select Project Report (${quickPickOptions.size} Report${quickPickOptions.size > 1 ? 's' : ''} Available)`
		const quickPick = new QuickPick(quickPickOptions, placeholder)
		if (quickPickOptions.size === 0) {
			vscode.window.showInformationMessage('Oaklean: No Project Reports Available')
			return quickPick
		}

		const currentReportPath = this.container.storage.getWorkspace('reportPath') as UnifiedPath
		if (currentReportPath && workspaceDir) {
			quickPick.setCurrentItem(workspaceDir.pathTo(currentReportPath).toString())
		}
		quickPick.show()
		return quickPick
	}
}