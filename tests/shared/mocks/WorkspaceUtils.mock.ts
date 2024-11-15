import sinon from 'sinon'
import * as globSync from 'glob'
import { UnifiedPath } from '@oaklean/profiler-core'

import WorkspaceUtils from '../../../src/helper/WorkspaceUtils'
import { WORKSPACE_PATH } from '../constants/app'
import {
	PROFILE_PATH_001,
	PROFILE_PATH_002,
	PROFILE_PATH_003,
	PROJECT_REPORT_PATH_001,
	PROJECT_REPORT_PATH_002,
	PROJECT_REPORT_PATH_003,
	PROJECT_REPORT_PATH_004,
	PROJECT_REPORT_PATH_005
} from '../constants/profiles'

const WORKSPACE_PATH_UNIFIED = new UnifiedPath(WORKSPACE_PATH)

export const stub_globSync = () => {
	const globSyncStub = sinon.stub(globSync, 'sync').callsFake(
		(
			pattern: string | string[]
		): string[] => {
			if ((pattern as string).endsWith('/**/*.oak')) {
				return [
					PROJECT_REPORT_PATH_003.toString(),
					PROJECT_REPORT_PATH_001.toString(),
					PROJECT_REPORT_PATH_002.toString(),
					PROJECT_REPORT_PATH_004.toString(),
					PROJECT_REPORT_PATH_005.toString()
				]
			}

			if ((pattern as string).endsWith('profiles/**/*.cpuprofile')) {
				return [
					WORKSPACE_PATH_UNIFIED.join(PROFILE_PATH_003).toString(),
					WORKSPACE_PATH_UNIFIED.join(PROFILE_PATH_001).toString(),
					WORKSPACE_PATH_UNIFIED.join(PROFILE_PATH_002).toString(),
				]
			}

			if ((pattern as string).endsWith('/**/.oaklean')) {
				return [
					WORKSPACE_PATH_UNIFIED.join('/**/.oaklean').toString()
				]
			}
			return []
		})
	return globSyncStub
}

export const stub_getWorkspaceDirStub = () => {
	const getWorkspaceDirStub = sinon.stub(WorkspaceUtils, 'getWorkspaceDir')
	getWorkspaceDirStub.returns(WORKSPACE_PATH_UNIFIED)

	return getWorkspaceDirStub
}

export const stub_getProjectReportPathsFromWorkspaceStub = () => {
	const getWorkspaceDirStub = sinon.stub(WorkspaceUtils, 'getProjectReportPathsFromWorkspace')
	getWorkspaceDirStub.returns(
		[
			new UnifiedPath(PROJECT_REPORT_PATH_001),
			new UnifiedPath(PROJECT_REPORT_PATH_002),
			new UnifiedPath(PROJECT_REPORT_PATH_003),
			new UnifiedPath(PROJECT_REPORT_PATH_004),
			new UnifiedPath(PROJECT_REPORT_PATH_005)
		]
	)

	return getWorkspaceDirStub
}
