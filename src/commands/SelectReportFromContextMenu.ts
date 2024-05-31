import vscode, { Uri } from 'vscode'
import { UnifiedPath } from '@oaklean/profiler-core'

import BaseCommand from './BaseCommand'

import { Container } from '../container'
import { isWindows } from '../utilities/getPlatform'
import { ERROR_NO_REPORT_PATH } from '../constants/infoMessages'

export enum CommandIdentifiers {
	selectReportFromContextMenu = 'selectReportFromContextMenu'
}

export default class SelectReport extends BaseCommand {
	container: Container
	
	constructor(container: Container) {
		super()
		this.container = container
	}

	getIdentifier(): CommandIdentifiers {
		return CommandIdentifiers.selectReportFromContextMenu
	}

	execute(uri:Uri) {
		let file = uri.path
		if (isWindows() && file.length > 0 && file[0] === '/') {
			file = file.slice(1)
		}
		const reportPath = new UnifiedPath(file)
		if (reportPath){
			this.container.storage.storeWorkspace('reportPath', reportPath)
		} else {
			vscode.window.showErrorMessage(ERROR_NO_REPORT_PATH)
		}
	}
}