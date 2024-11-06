import { UnifiedPath } from '@oaklean/profiler-core'

export const PROFILE_PATH_001 = new UnifiedPath('./profiles/session/001.cpuprofile').toPlatformString()
export const PROFILE_PATH_002 = new UnifiedPath('./profiles/session/002.cpuprofile').toPlatformString()
export const PROFILE_PATH_003 = new UnifiedPath('./profiles/session/003.cpuprofile').toPlatformString()

export const ALL_PROFILE_PATHS = [
	PROFILE_PATH_001,
	PROFILE_PATH_002,
	PROFILE_PATH_003
]

export const PROJECT_REPORT_PATH_001 = new UnifiedPath('/path/to/workspace/profiles/session/001.oak').toPlatformString()
export const PROJECT_REPORT_PATH_002 = new UnifiedPath('/path/to/workspace/profiles/session/002.oak').toPlatformString()
export const PROJECT_REPORT_PATH_003 = new UnifiedPath('/path/to/workspace/profiles/session/003.oak').toPlatformString()

export const PROJECT_REPORT_PATH_004 = new UnifiedPath('/path/to/workspace/AAA/profiles/session/011.oak').toPlatformString()
export const PROJECT_REPORT_PATH_005 = new UnifiedPath('/path/to/workspace/AAA/profiles/session/012.oak').toPlatformString()

export const ALL_PROJECT_REPORT_PATHS = [
	PROJECT_REPORT_PATH_001,
	PROJECT_REPORT_PATH_002,
	PROJECT_REPORT_PATH_003,
	PROJECT_REPORT_PATH_004,
	PROJECT_REPORT_PATH_005
]