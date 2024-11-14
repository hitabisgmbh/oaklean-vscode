import {
	ProfilerConfig,
	ProjectReport,
	UnifiedPath
} from '@oaklean/profiler-core'
import vscode from 'vscode'
import { VERSION } from '@oaklean/profiler-core/dist/src/constants/app'
import { VersionHelper } from '@oaklean/profiler-core/dist/src/helper/VersionHelper'

export class ProjectReportHelper {
	static loadReport(
		reportPath: UnifiedPath,
		config: ProfilerConfig
	): ProjectReport | null {
		try {
			const loadedReport = ProjectReport.loadFromFile(reportPath, 'bin', config)
			if (loadedReport === undefined) {
				vscode.window.showErrorMessage(`Could not find a profiler report at ${reportPath.toPlatformString()}`)
				return null
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
			vscode.window.showErrorMessage('The selected file is not a valid Oaklean report file.')
			return
		}
		const profilerVersion = VERSION
		if (reportVersion && VersionHelper.compare(profilerVersion, reportVersion) === -1) {
			vscode.window.showErrorMessage(`${reportPath.basename()} (Version: ${reportVersion}) ` +
				'is not compatible with the current version of Oaklean. Please update the extension to proceed')
		} else {
			vscode.window.showErrorMessage('The selected file could not be loaded. Please check if the file is valid.')
		}
	}
}