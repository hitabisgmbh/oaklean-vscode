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
		if (!workspaceDir) {
			return []
		}
		const config = WorkspaceUtils.getWorkspaceProfilerConfig()
		const profilesPath = config.getOutDir().join('**', '*.oak').toString()
		const projectReportPaths = globSync(profilesPath)
			.map((profilePath) => workspaceDir.pathTo(profilePath).toPlatformString())

		const profilesHistoryPath = config.getOutHistoryDir().join('**', '*.oak').toPlatformString()
		const projectReportHistoryPaths = globSync(profilesHistoryPath)
			.map((profilePath) => workspaceDir.pathTo(profilePath).toPlatformString())

		const result = [...projectReportPaths, ...projectReportHistoryPaths]

		PathUtils.sortFilePathArray(result)
		return result
	}

	static getFileFromWorkspace(filePath: string): UnifiedPath | undefined {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!workspaceDir) {
			return undefined
		}

		const unifiedFilePath = new UnifiedPath(workspaceDir.toString()).join(filePath)
		return unifiedFilePath
	}
}