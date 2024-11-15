import WorkspaceUtils from '../../src/helper/WorkspaceUtils'
import { WORKSPACE_PATH } from '../shared/constants/app'
import {
	PROFILE_PATH_001,
	PROFILE_PATH_002,
	PROFILE_PATH_003,
	PROJECT_REPORT_PATH_001,
	PROJECT_REPORT_PATH_002,
	PROJECT_REPORT_PATH_003,
	PROJECT_REPORT_PATH_004,
	PROJECT_REPORT_PATH_005
} from '../shared/constants/profiles'
import { stub_ProfilerConfig } from '../shared/mocks/ProfilerConfig.mock'
import { stub_globSync, stub_getWorkspaceDirStub } from '../shared/mocks/WorkspaceUtils.mock'

stub_ProfilerConfig()
stub_globSync()
stub_getWorkspaceDirStub()

describe('WorkspaceUtils.getWorkspaceDir', () => {
	it('should return the mocked value', () => {
		expect(WorkspaceUtils.getWorkspaceDir()?.toString()).toBe(WORKSPACE_PATH)
	})
})

describe('WorkspaceUtils.getCPUProfilesFromWorkspace', () => {
	it('should return the mocked value', () => {
		expect(WorkspaceUtils.getCPUProfilesFromWorkspace()).toEqual([
			PROFILE_PATH_001,
			PROFILE_PATH_002,
			PROFILE_PATH_003
		])
	})
})

describe('WorkspaceUtils.getProjectReportPathsFromWorkspace', () => {
	it('should return the mocked value', () => {
		expect(
			WorkspaceUtils.getProjectReportPathsFromWorkspace().map((path) => path.toString())
		).toEqual([
			PROJECT_REPORT_PATH_004,
			PROJECT_REPORT_PATH_005,
			PROJECT_REPORT_PATH_001,
			PROJECT_REPORT_PATH_002,
			PROJECT_REPORT_PATH_003,
		])
	})
})