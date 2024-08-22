import * as vscode from 'vscode'
import { SensorValues } from '@oaklean/profiler-core'

import SensorValueHover from './SensorValueHover'

export class SensorValueHoverProvider implements vscode.HoverProvider {
	private readonly hoverObjects: {
		decoration: vscode.TextEditorDecorationType;
		decorationRange: vscode.Range; sensorValues: SensorValues;
	}[]
	private formula: string | undefined
	constructor(hoverObjects: {
		decoration: vscode.TextEditorDecorationType;
		decorationRange: vscode.Range; sensorValues: SensorValues;
	}[], formula: string | undefined) {
		this.formula = formula
		this.hoverObjects = hoverObjects
	}
	provideHover(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken
	): vscode.ProviderResult<vscode.Hover> {

		const matchingDecoration = this.hoverObjects.find((decoration) => {
			// TODO: Find out, why vscode.Range.contains work (decoration.decorationRange.contains(position)) 
			// is not working
			const startLine = decoration.decorationRange.start.line
			const endLine = decoration.decorationRange.end.line
			const startPosition = decoration.decorationRange.start.character
			const endPosition = decoration.decorationRange.end.character

			const line = position.line
			const character = position.character

			return line >= startLine && line <= endLine &&
				((line === startLine && character >= startPosition) || (line === endLine && character <= endPosition))
		})

		if (matchingDecoration) {
			return new SensorValueHover(matchingDecoration.sensorValues, this.formula).provideHover()
		}
	}
}