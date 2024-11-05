import * as path from 'path'

import vscode from 'vscode'
import { sync as globSync } from 'glob'
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

	static async getProjectReportsForConfigToUpload(
		configPath: UnifiedPath, config: ProfilerConfig): Promise<ProjectReport[] | undefined> {
		const workSpaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!workSpaceDir) {
			return undefined
		}
		const parentDir = configPath.dirName()
		const outDir = new UnifiedPath(path.resolve(parentDir.toString(), config.getOutDir().toString()))
		const outHistoryDir	= new UnifiedPath(path.resolve(parentDir.toString(), config.getOutHistoryDir().toString()))

		const fullOutDir = workSpaceDir.join(outDir)
		const fullOutHistoryDir = workSpaceDir.join(outHistoryDir)

		const projectReportPaths = globSync(fullOutDir.join('**', '*.oak').toString())
			.map((profilePath) => new UnifiedPath(profilePath).toPlatformString())
			
		const projectReportHistoryPaths = globSync(fullOutHistoryDir.join('**', '*.oak').toString())
			.map((profilePath) => new UnifiedPath(profilePath).toPlatformString())

		const allPaths = [...projectReportPaths, ...projectReportHistoryPaths]
		const reports: ProjectReport[] = []
		for (const reportPath of allPaths) {
			let report: ProjectReport | undefined
			try {
				report = ProjectReport.loadFromFile(new UnifiedPath(reportPath), 'bin', config)
			} catch (e){
				console.error(e)
			}
			if (report) {
				const shoudBeUploaded = await report.shouldBeStoredInRegistry()
				if (shoudBeUploaded) {
					reports.push(report)
				}
			}
		}

		return reports
	}
}
