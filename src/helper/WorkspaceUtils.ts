import vscode from 'vscode'
import { sync as globSync } from 'glob'
import { PathUtils, UnifiedPath, ProfilerConfig } from '@oaklean/profiler-core'
import { STATIC_CONFIG_FILENAME } from '@oaklean/profiler-core/dist/src/constants/config'

export default class WorkspaceUtils {
	static getWorkspaceDir(): UnifiedPath | undefined {
		if (vscode.workspace.workspaceFolders !== undefined) {
			return new UnifiedPath(vscode.workspace.workspaceFolders[0].uri.fsPath)
		}
		return undefined
	}

	static getWorkspaceProfilerConfigPaths(): UnifiedPath[] {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!workspaceDir) {
			return []
		}

		const path = workspaceDir.join('/**/' + STATIC_CONFIG_FILENAME).toString()
		const profilePaths = globSync(path)
		return profilePaths.map((profilePath) => new UnifiedPath(profilePath))
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

	static getProjectReportPathsFromWorkspace(): UnifiedPath[] {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()?.join('**', '*.oak')
		console.log('workspaceDir', workspaceDir)
		if (!workspaceDir) {
			return []
		}

		const result = globSync(workspaceDir.toString(), { ignore: ['**/node_modules/**'] })
		PathUtils.sortFilePathArray(result)
		return result.map((reportPath) => new UnifiedPath(reportPath))
	}

	static getFullFilePath(config: ProfilerConfig, filePath: UnifiedPath | string): UnifiedPath {
		return config.getRootDir().join(filePath)
	}

	static getRelativeFilePath(config: ProfilerConfig, filePath: UnifiedPath | string): UnifiedPath {
		return config.getRootDir().pathTo(filePath)
	}

	static resolveConfigFromFile(configPath: UnifiedPath): {
		config?: ProfilerConfig,
		error?: string
	} {
		try {
			return {
				config: ProfilerConfig.resolveFromFile(configPath)
			}
		} catch (e: any) {
			return {
				error: e.message
			}
		}
	}

	static autoResolveConfigFromReportPath(reportPath: UnifiedPath): ProfilerConfig | null {
		try {
			return ProfilerConfig.autoResolveFromPath(reportPath.dirName())
		} catch (e) {
			vscode.window.showErrorMessage(
				`Error while loading the .oaklean config file for the report: ${reportPath.basename()}.` +
				' Please make sure that the config file is present and has the correct format.'
			)
			return null
		}
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
