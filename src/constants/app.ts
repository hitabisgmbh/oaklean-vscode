import * as fs from 'fs'

import { UnifiedPath, PathUtils } from '@oaklean/profiler-core'

export const APP_IDENTIFIER = 'oaklean'

export const DEBUG_MODE = process.env.NODE_ENV === 'development'

const packageJsonPath = PathUtils.findUp('package.json', __dirname)
if (!packageJsonPath) {
	throw new Error('Module cannot access its own package.json')
}

const package_version = JSON.parse(fs.readFileSync(
	new UnifiedPath(packageJsonPath).toString()
	, 'utf-8')).version

export const EXTENSION_VERSION = package_version