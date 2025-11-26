import { VersionHelper } from '@oaklean/profiler-core'

export class VersionCompatibilityHelper {
	static checkReportCompatibility(reportVersion: string): string | null {
		if (VersionHelper.compare('0.1.5', reportVersion) === 1) {
			// The report was generated with a version older than 0.1.5
			return `The loaded report was generated using Oaklean version ${reportVersion}.
					The current release of the Oaklean Profiler includes significant updates and enhancements.
					Because the source-code parsing mechanism was revised in version 0.1.5,
					some features may not function as expected and certain elements may not be highlighted correctly.`
		}
		return null
	}
}
