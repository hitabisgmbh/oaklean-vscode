import path from 'path'
import fs from 'fs'

import vscode from 'vscode'

export function getExtensionVersion(): string {
	const extensionPath = vscode.extensions.getExtension('HitabisGmbH.oaklean')?.extensionPath
	if (!extensionPath) {
			return 'Unknown version'
	}
	const packageJsonPath = path.join(extensionPath, 'package.json')
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
	return packageJson.version
}
