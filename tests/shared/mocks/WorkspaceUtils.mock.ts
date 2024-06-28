import sinon from 'sinon'
import * as glob from 'glob'
import { UnifiedPath } from '@oaklean/profiler-core'

import WorkspaceUtils from '../../../src/helper/WorkspaceUtils'
import { WORKSPACE_PATH } from '../constants/app'
import {
	PROFILE_PATH_001,
	PROFILE_PATH_002,
	PROFILE_PATH_003,
	PROJECT_REPORT_PATH_001,
	PROJECT_REPORT_PATH_002,
	PROJECT_REPORT_PATH_003
} from '../constants/profiles'

const WORKSPACE_PATH_UNIFIED = new UnifiedPath(WORKSPACE_PATH)

export const stub_globSync = () => {
	const globSyncStub = sinon.stub(glob, 'sync').callsFake(
		(
			pattern: string | string[]
		): string[] => {
			if ((pattern as string).endsWith('profiles/**/*.oak')) {
				return [
					WORKSPACE_PATH_UNIFIED.join(PROJECT_REPORT_PATH_003).toString(),
					WORKSPACE_PATH_UNIFIED.join(PROJECT_REPORT_PATH_001).toString(),
					WORKSPACE_PATH_UNIFIED.join(PROJECT_REPORT_PATH_002).toString(),
				]
			}

			if ((pattern as string).endsWith('profiles/**/*.cpuprofile')) {
				return [
					WORKSPACE_PATH_UNIFIED.join(PROFILE_PATH_003).toString(),
					WORKSPACE_PATH_UNIFIED.join(PROFILE_PATH_001).toString(),
					WORKSPACE_PATH_UNIFIED.join(PROFILE_PATH_002).toString(),
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

export const stub_getProjectReportFromWorkspaceStub = () => {
	const getWorkspaceDirStub = sinon.stub(WorkspaceUtils, 'getProjectReportFromWorkspace')
	getWorkspaceDirStub.returns(	
		[PROJECT_REPORT_PATH_001,
			PROJECT_REPORT_PATH_002,
			PROJECT_REPORT_PATH_003]
	)

	return getWorkspaceDirStub
}
