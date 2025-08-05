import vscode from 'vscode'
import {
	UnifiedPath,
	SourceNodeIdentifier_string
} from '@oaklean/profiler-core'

import BaseCommand from './BaseCommand'

import { Container } from '../container'
import { APP_IDENTIFIER } from '../constants/app'
import WorkspaceUtils from '../helper/WorkspaceUtils'
// Types
import {
	OpenSourceLocationCommandIdentifiers,
	OpenSourceLocationCommandArgs
} from '../types/commands/OpenSourceLocationCommand'

export default class OpenSourceLocationCommand extends BaseCommand {
	private _disposable: vscode.Disposable
	_container: Container

	constructor(container: Container) {
		super()
		this._container = container
		this._disposable = vscode.Disposable.from()
	}

	register() {
		return vscode.commands.registerCommand(
			`${APP_IDENTIFIER}.${OpenSourceLocationCommandIdentifiers.openSourceLocation}`,
			(args: OpenSourceLocationCommandArgs) => {
				this.openSourceNodeIdentifier(args)
			}
		)
	}

	dispose() {
		this._disposable.dispose()
	}

	async openSourceNodeIdentifier(args: OpenSourceLocationCommandArgs) {
		const identifier = args.sourceNodeIdentifier
		const filePath = new UnifiedPath(args.filePath)
		const config = this._container.textDocumentController.config
		if (!config) {
			return
		}
		const fullPath = filePath.isRelative() ? WorkspaceUtils.getFullFilePath(config, filePath) : filePath
		const relativePath = filePath.isRelative() ? filePath : WorkspaceUtils.getRelativeFilePath(config, filePath)
		const uri = vscode.Uri.file(fullPath.toString())
		const errorMessage = `Could not find file: ${fullPath}`
		try {
			const document = await vscode.workspace.openTextDocument(uri)

			if (document) {
				const programStructureTreeOfFile =
					this._container.textDocumentController.getProgramStructureTreeOfFile(
						relativePath
					)
				let position
				if (programStructureTreeOfFile) {
					const sourceIdentifierString = identifier.replace(
						/"/g,
						''
					) as SourceNodeIdentifier_string
					const loc = programStructureTreeOfFile.sourceLocationOfIdentifier(
						sourceIdentifierString
					)
					if (loc) {
						position = new vscode.Position(
							loc.beginLoc.line - 1,
							loc.beginLoc.column
						)
					}
				}
				if (position) {
					await vscode.window.showTextDocument(document, {
						selection: new vscode.Range(position, position)
					})
				} else {
					await vscode.window.showTextDocument(document)
				}
			}
		} catch (error) {
			vscode.window.showErrorMessage(errorMessage)
			console.error(error)
			console.error(errorMessage)
		}
	}

	static execute(args: {
		command: OpenSourceLocationCommandIdentifiers.openSourceLocation,
		args: OpenSourceLocationCommandArgs
	}) {
		vscode.commands.executeCommand(
			`${APP_IDENTIFIER}.${OpenSourceLocationCommandIdentifiers.openSourceLocation}`,
			args.args
		)
	}
}
