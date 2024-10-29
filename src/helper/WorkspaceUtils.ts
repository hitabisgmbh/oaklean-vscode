import vscode from 'vscode'
import { sync as globSync } from 'glob'
import { PathUtils, UnifiedPath, ProfilerConfig } from '@oaklean/profiler-core'

export default class WorkspaceUtils {
	static getWorkspaceDir(): UnifiedPath | undefined {
		if (vscode.workspace.workspaceFolders !== undefined) {
			return new UnifiedPath(vscode.workspace.workspaceFolders[0].uri.fsPath)
		}
		return undefined
	}

	static getWorkspaceProfilerConfig(): ProfilerConfig {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!workspaceDir) {
			return ProfilerConfig.resolveFromFile(undefined)
		}
		try {
			return ProfilerConfig.autoResolveFromPath(workspaceDir)
		} catch {
			return ProfilerConfig.resolveFromFile(undefined)
		}
	}

	static getWorkspaceProfilerConfigPaths(): string[] {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!workspaceDir) {
			return []
		}

		const path = workspaceDir.join('/**/.oaklean').toString()
		const profilePaths = globSync(path).map((configPath) => workspaceDir.pathTo(configPath).toPlatformString())
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
    const workspaceDir = WorkspaceUtils.getWorkspaceDir()
    const configPaths = WorkspaceUtils.getWorkspaceProfilerConfigPaths()
    if (!workspaceDir || !configPaths) {
        return []
    }
    
    let result: string[] = []
    
    for (const configPath of configPaths) {
				const fullConfigPath = workspaceDir?.join(configPath)
        const config = ProfilerConfig.resolveFromFile(fullConfigPath)
        
        const profilesPath = config.getOutDir().join('**', '*.oak').toString()
        const projectReportPaths = globSync(profilesPath)
            .map((profilePath) => workspaceDir.pathTo(profilePath).toPlatformString())

        const profilesHistoryPath = config.getOutHistoryDir().join('**', '*.oak').toPlatformString()
        const projectReportHistoryPaths = globSync(profilesHistoryPath)
            .map((profilePath) => workspaceDir.pathTo(profilePath).toPlatformString())

        result = [...result, ...projectReportPaths, ...projectReportHistoryPaths]
    }

    PathUtils.sortFilePathArray(result)
    return result
	}

	static getFileFromWorkspace(filePath: string): UnifiedPath | undefined {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!workspaceDir) {
			return undefined
		}

		const unifiedFilePath = new UnifiedPath(filePath)
		return unifiedFilePath
	}

	static getFullFilePath(config: ProfilerConfig, filePath: string): UnifiedPath | undefined {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!workspaceDir) {
			return undefined
		}
		const rootDir = config.getRootDir()
		const unifiedFilePath = new UnifiedPath(filePath)
		const fullFilePath = rootDir.join(unifiedFilePath)
		if (fullFilePath){
			return fullFilePath
		} else {
			return undefined
		}
	}
}
