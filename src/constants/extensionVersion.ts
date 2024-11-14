import fs from 'fs'

import { PathUtils, UnifiedPath} from '@oaklean/profiler-core'


const extensionJsonPath = PathUtils.findUp('package.json', __dirname)
	if (!extensionJsonPath) {
		throw new Error('Module cannot access its own package.json')
	}
	
export const extension_version = JSON.parse(fs.readFileSync(
	new UnifiedPath(extensionJsonPath).toString()
	, 'utf-8')).version