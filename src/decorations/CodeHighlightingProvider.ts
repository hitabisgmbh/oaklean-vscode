import vscode from 'vscode'

import { Container } from '../container'
import WorkspaceUtils from '../helper/WorkspaceUtils'
import { SensorValueRepresentation } from '../types/sensorValueRepresentation'
import { calcOrReturnSensorValue } from '../helper/FormulaHelper'
import { SensorValueFormatHelper } from '../helper/SensorValueFormatHelper'
import { PROFILE_PERCENT_PRECISION } from '../constants/profile'
import { SensorValueTypeNames } from '../types/sensorValues'
import { GlyphChars } from '../constants/characters'
import { pad } from '../system/string'
import { Color } from '../types/color'
import { getImportanceColor } from '../system/color'

export type LineProfileDecoration = {
	decoration: vscode.TextEditorDecorationType
	decorationRanges: vscode.Range[]
}

export class CodeHighlightingProvider extends vscode.Disposable {
	private _container: Container
	private textDecorations: vscode.TextEditorDecorationType[]

	constructor(container: Container) {
		super(() => this.dispose())
		this._container = container
		this.textDecorations = []
	}

	dispose() {
		this.disposeTextDecoration()
	}

	disposeTextDecoration() {
		this.textDecorations.forEach((decoration) => decoration.dispose())
	}

	provideDecorations(editor: vscode.TextEditor) {
		this.disposeTextDecoration()
		const sensorValueRepresentation = this._container.storage.getWorkspace(
			'sensorValueRepresentation'
		) as SensorValueRepresentation

		const config = this._container.textDocumentController.config
		if (config === undefined) {
			return []
		}
		const relativeFile = WorkspaceUtils.getRelativeFilePath(
			config,
			editor.document.fileName
		)
		const { projectReport, sourceFileMetaData, programStructureTreeOfFile } =
			this._container.textDocumentController.getReportInfoOfFile(relativeFile)

		if (
			projectReport === undefined ||
			sourceFileMetaData === undefined ||
			programStructureTreeOfFile === undefined
		) {
			return []
		}

		const functionsOfFile = sourceFileMetaData.functions
		const totalAndMaxMetaData = projectReport.totalAndMaxMetaData()

		for (const [
			sourceNodeID,
			sourceNodeMetaData
		] of functionsOfFile.entries()) {
			const sourceNodeIndex =
				projectReport.globalIndex.getSourceNodeIndexByID(sourceNodeID)
			if (sourceNodeIndex === undefined) {
				continue
			}
			const locationOfFunction =
				programStructureTreeOfFile.sourceLocationOfIdentifier(
					sourceNodeIndex.identifier
				)
			if (!locationOfFunction) {
				if (sourceNodeIndex.presentInOriginalSourceCode) {
					console.error(
						'SourceNodeIndexNotFoundError',
						`Could not find location of function ${sourceNodeIndex.identifier}`
					)
				}
				continue
			}
			const { beginLoc } = locationOfFunction
			let message
			let weight: number
			if (
				sensorValueRepresentation.selectedSensorValueType === 'customFormula'
			) {
				const calculatedFormula = calcOrReturnSensorValue(
					sourceNodeMetaData.sensorValues,
					sensorValueRepresentation
				)
				const formattedCalculatedFormula = SensorValueFormatHelper.format(
					calculatedFormula,
					sensorValueRepresentation.selectedSensorValueType
				)
				const formulaTotal = calcOrReturnSensorValue(
					totalAndMaxMetaData.total.sensorValues,
					sensorValueRepresentation
				)
				const relativeToTotalForFormula =
					(calculatedFormula / formulaTotal) * 100
				message =
					`${sensorValueRepresentation.formula}: ${formattedCalculatedFormula.value} ` +
					`(${relativeToTotalForFormula.toFixed(PROFILE_PERCENT_PRECISION)}%)`
				weight =
					calculatedFormula /
					calcOrReturnSensorValue(
						totalAndMaxMetaData.max.sensorValues,
						sensorValueRepresentation
					)
			} else {
				const value =
					sourceNodeMetaData.sensorValues[
						sensorValueRepresentation.selectedSensorValueType
					]
				const total =
					totalAndMaxMetaData.total.sensorValues[
						sensorValueRepresentation.selectedSensorValueType
					]
				const relativeToTotal = total === 0 ? 0 : (value / total) * 100
				const formattedValue = SensorValueFormatHelper.format(
					value,
					sensorValueRepresentation.selectedSensorValueType
				)
				message =
					SensorValueTypeNames[
						sensorValueRepresentation.selectedSensorValueType
					] +
					`: ${formattedValue.value} ${formattedValue.unit} ` +
					`(${relativeToTotal.toFixed(PROFILE_PERCENT_PRECISION)}%)`
				weight =
					value /
					totalAndMaxMetaData.max.sensorValues[
						sensorValueRepresentation.selectedSensorValueType
					]
			}

			const line = this.highlightLine(editor, beginLoc.line - 1, message, weight)
			this.textDecorations.push(line.decoration)
			editor.setDecorations(line.decoration, line.decorationRanges)
		}
	}

	highlightLine(
		editor: vscode.TextEditor,
		lineNumber: number,
		message: string,
		importanceWeight: number
	): LineProfileDecoration {
		const profile = this._container.profileHelper.currentProfile
		const color: Color = profile?.color || Color.Red
		const { red, green, blue, alpha } = getImportanceColor(
			color,
			importanceWeight
		)
		const backgroundColor = `RGBA(${red}, ${green}, ${blue}, ${alpha})`
		const colorTheme = vscode.window.activeColorTheme

		let textColor: string
		if (colorTheme.kind === vscode.ColorThemeKind.Dark) {
			textColor = '#ffffff'
		} else {
			textColor = '#000000'
		}

		const start = new vscode.Position(lineNumber, 0)
		const end = new vscode.Position(
			lineNumber,
			editor.document.lineAt(lineNumber).text.length
		)

		const decorationRange = new vscode.Range(start, end)
		const decorationOptions = {
			isWholeLine: true,
			backgroundColor: backgroundColor,
			overviewRulerColor: backgroundColor,
			overviewRulerLane: vscode.OverviewRulerLane.Left,
			after: {
				backgroundColor: '#00000000',
				color: textColor,
				contentText: pad(message.replace(/ /g, GlyphChars.Space), 1, 1),
				fontWeight: 'normal',
				fontStyle: 'normal'
			}
		}
		const decoration =
			vscode.window.createTextEditorDecorationType(decorationOptions)
		return {
			decoration: decoration,
			decorationRanges: [decorationRange]
		}
	}
}
