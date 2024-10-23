import vscode from 'vscode'
import { UnifiedPath } from '@oaklean/profiler-core'

import BaseCommand from './BaseCommand'

import { Container } from '../container'
import WorkspaceUtils from '../helper/WorkspaceUtils'
import QuickPick, { QuickPickOptions } from '../components/QuickPick'

export enum CommandIdentifiers {
	selectConfig = 'selectConfig'
}

export default class selectConfig extends BaseCommand {
	container: Container

	constructor(container: Container) {
		super()
		this.container = container
	}

	getIdentifier(): CommandIdentifiers {
		return CommandIdentifiers.selectConfig
	}

	execute() {
		const configFilePaths = WorkspaceUtils.getWorkspaceProfilerConfigPaths()
		const quickPickOptions: QuickPickOptions = new Map()
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		for (const configFilePath of configFilePaths) {
			quickPickOptions.set(configFilePath, {
				selectionCallback: () => {
					const configPath = workspaceDir?.join(configFilePath)
					if (configPath) {
						this.container.storage.storeWorkspace('configPath', configPath)
					}
				}
			})
		}
		const placeholder = `Select Config (.oaklean) (${quickPickOptions.size} Configs${quickPickOptions.size > 1 ? 's' : ''} Available)`
		const quickPick = new QuickPick(quickPickOptions, placeholder)
		if (quickPickOptions.size === 0) {
			vscode.window.showInformationMessage('Oaklean: .oaklean Configs Available')
			return quickPick
		}

		const currentConfig = this.container.storage.getWorkspace('configPath') as UnifiedPath
		if (currentConfig && workspaceDir) {
			const relativePath = workspaceDir.pathTo(currentConfig).toPlatformString()
			quickPick.setCurrentItem(relativePath)
		}
		quickPick.show()
		return quickPick
	}
}