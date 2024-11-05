import * as path from 'path'

import vscode from 'vscode'
import { glob, sync as globSync } from 'glob'
import { PathUtils, UnifiedPath, ProfilerConfig, ProjectReport } from '@oaklean/profiler-core'
import { STATIC_CONFIG_FILENAME } from '@oaklean/profiler-core/dist/src/constants/config'

import { Container } from '../container'

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
    const workspaceDir = WorkspaceUtils.getWorkspaceDir()?.join('**', '*.oak')
	
    if (!workspaceDir) {
        return []
    }
    
		const result = glob.sync(workspaceDir.toString(), { ignore: ['**/node_modules/**'] })
			.map((reportPath) => reportPath)
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

	static async getProjectReportsForConfigToUpload(config: ProfilerConfig, container: Container
	): Promise<ProjectReport[] | undefined> {
		const workSpaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!workSpaceDir) {
			return undefined
		}

		const outDir = config.getOutDir()
		const outHistoryDir = config.getOutHistoryDir()
		const reports: ProjectReport[] = []
		const outDirReportPaths = globSync(outDir.join('**', '*.oak').toString())
		const historyOutDirPaths = globSync(outHistoryDir.join('**', '*.oak').toString())
		const allPaths = [...outDirReportPaths, ...historyOutDirPaths]

		for (const reportPath of allPaths) {
			const shouldNotBeStored = container.storage.get(`reportPathShouldNotBeStored-${reportPath}`)
			if (shouldNotBeStored){
				continue
			}
			let report
			try {
				report = ProjectReport.loadFromFile(new UnifiedPath(reportPath), 'bin', config)
			} catch (e){
				console.error('Error loading report:', e)
				continue
			}

			if (report) {
				const shoudBeUploaded = await report.shouldBeStoredInRegistry()
				
				if (shoudBeUploaded) {
					reports.push(report)
				} else {
					container.storage.store(`reportPathShouldNotBeStored-${reportPath}`, true)
				}
			}
		}
		return reports
	}
}
