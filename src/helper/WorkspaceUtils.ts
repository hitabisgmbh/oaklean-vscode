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
				const config = WorkspaceUtils.resolveConfigFromFile(fullConfigPath)
        if (!config) {
					continue
				}
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
}
