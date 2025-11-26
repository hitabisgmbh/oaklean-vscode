import {
	ProjectReport,
	UnifiedPath,
	VersionHelper,
	VERSION
} from '@oaklean/profiler-core'
import vscode from 'vscode'

import { VersionCompatibilityHelper } from './VersionCompatibilityHelper'

export class ProjectReportHelper {
	static loadReport(reportPath: UnifiedPath): ProjectReport | null {
		try {
			const loadedReport = ProjectReport.loadFromFile(reportPath, 'bin')
			if (loadedReport === undefined) {
				vscode.window.showErrorMessage(
					`Could not find a profiler report at ${reportPath.toPlatformString()}`
				)
				return null
			}
			const warnMessage = VersionCompatibilityHelper.checkReportCompatibility(
				loadedReport.reportVersion
			)
			if (warnMessage !== null) {
				vscode.window.showWarningMessage(warnMessage)
			}

			return loadedReport
		} catch (e) {
			ProjectReportHelper.showReportErrorReason(reportPath)
			return null
		}
	}

	static showReportErrorReason(reportPath: UnifiedPath): void {
		let reportVersion
		try {
			reportVersion = ProjectReport.versionFromBinFile(reportPath)
		} catch (error) {
			vscode.window.showErrorMessage(
				'The selected file is not a valid Oaklean report file.'
			)
			return
		}
		const profilerVersion = VERSION
		if (
			reportVersion &&
			VersionHelper.compare(profilerVersion, reportVersion) === -1
		) {
			vscode.window.showErrorMessage(
				`${reportPath.basename()} (Version: ${reportVersion}) ` +
					'is not compatible with the current version of Oaklean. Please update the extension to proceed'
			)
		} else {
			vscode.window.showErrorMessage(
				'The selected file could not be loaded. Please check if the file is valid.'
			)
		}
	}
}
