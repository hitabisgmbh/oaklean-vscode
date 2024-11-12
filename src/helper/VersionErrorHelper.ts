import { ProjectReport, UnifiedPath } from '@oaklean/profiler-core'
import vscode from 'vscode'
import { VERSION } from '@oaklean/profiler-core/dist/src/constants/app'
import { VersionHelper } from '@oaklean/profiler-core/dist/src/helper/VersionHelper'

import { extension_version } from '../constants/extensionVersion'

export class VersionErrorHelper {
	static showVersionInformationOrError(reportPath: UnifiedPath): void {
		let reportVersion
		try {
				reportVersion = ProjectReport.versionFromBinFile(reportPath)
		} catch (error) {
				vscode.window.showErrorMessage('The selected file is not a valid Oaklean report file.')
				return
		}
	const profilerVersion = VERSION
	if (reportVersion && VersionHelper.compare(profilerVersion, reportVersion) === -1) {
		vscode.window.showInformationMessage(`${reportPath.basename()} (Version: ${reportVersion}) `+
		'is not compatible with the current version of Oaklean. Please update the application.')
		vscode.window.showInformationMessage(`Extension Version: ${extension_version} `+ 
			`(reports up to version ${profilerVersion})`)
	} else {
		vscode.window.showErrorMessage('The selected file could not be loaded. Please check if the file is valid.')
	}
	}
}