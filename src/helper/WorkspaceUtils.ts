import * as fs from 'fs'
import * as path from 'path'

import vscode from 'vscode'
import { sync as globSync } from 'glob'
import { PathUtils, UnifiedPath, ProfilerConfig } from '@oaklean/profiler-core'
import { re } from 'mathjs'
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

		const unifiedFilePath = new UnifiedPath(filePath)
		return unifiedFilePath
	}

	static getFulleFilePath(filePath: string): UnifiedPath | undefined {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!workspaceDir) {
			return undefined
		}
		const resolvedPath = WorkspaceUtils.findFileWithUnknownDirs(workspaceDir.toString(), filePath)
		if (resolvedPath){
			const unifiedFilePath = new UnifiedPath(resolvedPath)
			return unifiedFilePath
		} else {
			return undefined
		}
	}

	static findFileRecursively(startDir: string, pathParts: string[]): string | undefined {
    const items = fs.readdirSync(startDir)

    for (const item of items) {
        const fullPath = path.join(startDir, item)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory()) {
            if (item === pathParts[0]) {
                if (pathParts.length === 1) {
                    const filePath = path.join(fullPath, pathParts[0])
                    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                        return filePath
                    }
                } else {
                    const result = WorkspaceUtils.findFileRecursively(fullPath, pathParts.slice(1))
                    if (result) {
                        return result
                    }
                }
            } else {
                const result = WorkspaceUtils.findFileRecursively(fullPath, pathParts)
                if (result) {
                    return result
                }
            }
        } else if (stat.isFile() && item === pathParts[0]) {
						if (pathParts.length === 1) {
								return fullPath
						}
					}
    }

    return undefined
}


	static findFileWithUnknownDirs(rootDir: string, relativeFilePath: string): string | undefined {
    if (relativeFilePath.startsWith('./')) {
        relativeFilePath = relativeFilePath.slice(2)
    } else if (relativeFilePath.startsWith('.')) {
        relativeFilePath = relativeFilePath.slice(1)
    }

    const pathParts = relativeFilePath.split(path.sep)
    return WorkspaceUtils.findFileRecursively(rootDir, pathParts)
}

}
