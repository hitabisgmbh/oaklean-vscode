import * as path from 'path'

import vscode from 'vscode'
import { glob, sync as globSync } from 'glob'
import { PathUtils, UnifiedPath, ProfilerConfig, ProjectReport } from '@oaklean/profiler-core'
import { STATIC_CONFIG_FILENAME } from '@oaklean/profiler-core/dist/src/constants/config'

export default class WorkspaceUtils {
	static getWorkspaceDir(): UnifiedPath | undefined {
		if (vscode.workspace.workspaceFolders !== undefined) {
			return new UnifiedPath(vscode.workspace.workspaceFolders[0].uri.fsPath)
		}
		return undefined
	}

	static getWorkspaceProfilerConfigPaths(): string[] {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!workspaceDir) {
			return []
		}

		const path = workspaceDir.join('/**/' + STATIC_CONFIG_FILENAME).toString()
		const profilePaths = globSync(path)
		return profilePaths
	}

	static getCPUProfilesFromWorkspace(): string[] {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!workspaceDir) {
			return []
		}

		const path = workspaceDir.join('/**/profiles/**/*.cpuprofile').toString()
		const profilePaths = globSync(path).map((profilePath) => workspaceDir.pathTo(profilePath).toPlatformString())
		PathUtils.sortFilePathArray(profilePaths)
		return profilePaths
	}

	static getProjectReportFromWorkspace(): string[] {
    const workspaceDir = WorkspaceUtils.getWorkspaceDir()?.join('**', '*.oak')
		console.log('workspaceDir', workspaceDir)
    if (!workspaceDir) {
        return []
    }
    
		const result = globSync(workspaceDir.toString(), { ignore: ['**/node_modules/**'] })
    PathUtils.sortFilePathArray(result)
    return result
	}

	static getFullFilePath(config: ProfilerConfig, filePath: string): UnifiedPath {
		return config.getRootDir().join(filePath)
	}

	static resolveConfigFromFile(configPath: UnifiedPath): ProfilerConfig | undefined {
		try {
			return ProfilerConfig.resolveFromFile(configPath)
		} catch (e) {
			return undefined
		}
	}

	static autoResolveConfigFromPath(configPath: UnifiedPath): ProfilerConfig | undefined {
		try {
			return ProfilerConfig.autoResolveFromPath(configPath)
		} catch (e) {
			return undefined
		}
	}

	static configRootPath(configPath: UnifiedPath, config: ProfilerConfig): UnifiedPath | undefined {
		const root = config.getRootDir().toString()
		const parentDir = path.dirname(configPath.toString())
		const workSpaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!workSpaceDir) {
			return undefined
		}
		const fullConfigPath = workSpaceDir.join(parentDir)
		const absoluteRootPath = path.resolve(fullConfigPath.toString(), root)

		return new UnifiedPath(absoluteRootPath)
	}

	static getProjectReportPathsForConfig(config: ProfilerConfig): string[] | undefined {
		const workSpaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!workSpaceDir) {
			return undefined
		}

		const outDir = config.getOutDir()
		const outHistoryDir = config.getOutHistoryDir()
		const outDirReportPaths = globSync(outDir.join('**', '*.oak').toString())
		const historyOutDirPaths = globSync(outHistoryDir.join('**', '*.oak').toString())
		const allPaths = [...outDirReportPaths, ...historyOutDirPaths]
		return allPaths
	}
}
