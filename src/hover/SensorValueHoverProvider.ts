import vscode, { Disposable } from 'vscode'

import SensorValueHover from './SensorValueHover'

import WorkspaceUtils from '../helper/WorkspaceUtils'
import { Container } from '../container'
import { SensorValueRepresentation } from '../types/sensorValueRepresentation'

export class SensorValueHoverProvider implements vscode.HoverProvider {
	private _container: Container
	constructor(container: Container) {
		this._container = container
	}

	provideHover(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken
	): vscode.ProviderResult<vscode.Hover> {
		const enableLineAnnotations = this._container.storage.getWorkspace(
			'enableLineAnnotations',
			true
		) as boolean
		if (enableLineAnnotations === false) {
			return
		}
		const relativeWorkspacePath = WorkspaceUtils.getRelativeWorkspacePath(
			document.fileName
		)

		if (relativeWorkspacePath === undefined) {
			return
		}
		const sourceFileInfo =
			this._container.textDocumentController.getSourceFileInformationOfFile(
				relativeWorkspacePath
			)

		if (
			sourceFileInfo === undefined ||
			sourceFileInfo.sourceNodeMetaDataByLine === undefined
		) {
			return
		}
		const line = position.line
		const sourceNodeMetaDatas =
			sourceFileInfo.sourceNodeMetaDataByLine.get(line)
		if (sourceNodeMetaDatas === undefined || sourceNodeMetaDatas.length === 0) {
			return
		}
		const sourceNodeMetaData = sourceNodeMetaDatas[0]

		const sensorValueRepresentation = this._container.storage.getWorkspace(
			'sensorValueRepresentation'
		) as SensorValueRepresentation

		return SensorValueHover.provideHover(
			sourceNodeMetaData,
			sensorValueRepresentation
		)
	}

	static register(container: Container) {
		const hoverProvider = new SensorValueHoverProvider(container)

		return Disposable.from(
			vscode.languages.registerHoverProvider(
				{ scheme: 'file', language: 'javascript' },
				hoverProvider
			),
			vscode.languages.registerHoverProvider(
				{ scheme: 'file', language: 'typescript' },
				hoverProvider
			)
		)
	}
}
