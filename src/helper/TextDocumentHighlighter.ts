import { text } from 'stream/consumers'

import vscode, { TextEditor, TextEditorDecorationType } from 'vscode'
import { SensorValues, UnifiedPath } from '@oaklean/profiler-core'

import { calcOrReturnSensorValue } from './FormulaHelper'
import { SensorValueFormatHelper } from './SensorValueFormatHelper'

import { pad } from '../system/string'
import { getImportanceColor } from '../system/color'
import { GlyphChars } from '../constants/characters'
import { PROFILE_PERCENT_PRECISION } from '../constants/profile'
import { Container } from '../container'
import { ExtendedSensorValueType, SensorValueType, SensorValueTypeNames } from '../types/sensorValues'
import { Profile } from '../types/profile'
import { Color } from '../types/color'
import { SensorValueRepresentation } from '../types/sensorValueRepresentation'

export type LineProfileDecoration = {
	decoration: TextEditorDecorationType,
	decorationRange: vscode.Range,
	decorationOptions: vscode.DecorationRenderOptions
	sensorValues: SensorValues
}

export class TextDocumentHighlighter {

	static highlightLine(
		editor: TextEditor,
		lineNumber: number,
		message: string,
		importanceWeight: number,
		sensorValues: SensorValues,
		profile?: Profile
	): LineProfileDecoration {
		const color: Color = (profile?.color || Color.Red)
		const { red, green, blue, alpha } = getImportanceColor(color, importanceWeight)
		const backgroundColor = `RGBA(${red}, ${green}, ${blue}, ${alpha})`
		const colorTheme = vscode.window.activeColorTheme

		let textColor: string
		if (colorTheme.kind === vscode.ColorThemeKind.Dark) {
			textColor = '#ffffff'
		} else {
			textColor = '#000000'
		}

		const start = new vscode.Position(lineNumber, 0)
		const end = new vscode.Position(lineNumber, editor.document.lineAt(lineNumber).text.length)

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
		const decoration = vscode.window.createTextEditorDecorationType(decorationOptions)
		editor.setDecorations(decoration, [decorationRange])
		return {
			decoration: decoration,
			decorationRange: decorationRange,
			decorationOptions: decorationOptions,
			sensorValues: sensorValues
		}
	}

	static *lineAnnotationsByReport(
		editor: TextEditor,
		selectedSensorValueType: ExtendedSensorValueType,
		filePathRelativeToWorkspace: UnifiedPath,
		container: Container
	): Generator<LineProfileDecoration> {
		const profile = container.profileHelper.currentProfile
		const {
			projectReport,
			sourceFileMetaData,
			programStructureTreeOfFile
		} = container.textDocumentController.getReportInfoOfFile(filePathRelativeToWorkspace)

		if (!projectReport || !sourceFileMetaData || !programStructureTreeOfFile) {
			return
		}
		const functionsOfFile = sourceFileMetaData.functions
		const totalAndMaxMetaData = projectReport.totalAndMaxMetaData()

		for (const [sourceNodeID, sourceNodeMetaData] of functionsOfFile.entries()) {
			const sourceNodeIndex = projectReport.globalIndex.getSourceNodeIndexByID(sourceNodeID)
			if (sourceNodeIndex === undefined) {
				continue
			}
			const locationOfFunction =
				programStructureTreeOfFile.sourceLocationOfIdentifier(sourceNodeIndex.identifier)
			if (!locationOfFunction) {
				if (sourceNodeIndex.presentInOriginalSourceCode) {
					console.error('SourceNodeIndexNotFoundError', `Could not find location of function ${sourceNodeIndex.identifier}`)
				}
				continue
			}
			const { beginLoc } = locationOfFunction
			let message
			let weight: number
			if (selectedSensorValueType === 'customFormula') {
				const sensorValueRepresentation = container.storage.getWorkspace('sensorValueRepresentation') as SensorValueRepresentation
				const formula = sensorValueRepresentation.formula
				const calculatedFormula = calcOrReturnSensorValue(
					sourceNodeMetaData.sensorValues, selectedSensorValueType, formula)
				const formattedCalculatedFormula = SensorValueFormatHelper.format(
					calculatedFormula,
					selectedSensorValueType
				)
				const formulaTotal = calcOrReturnSensorValue(
					totalAndMaxMetaData.total.sensorValues, selectedSensorValueType, formula)
				const relativeToTotalForFormula = calculatedFormula / formulaTotal
				message = `${formula}: ${formattedCalculatedFormula.value} ` +
					`(${relativeToTotalForFormula.toFixed(PROFILE_PERCENT_PRECISION)}%)`
				weight = calculatedFormula / calcOrReturnSensorValue(
					totalAndMaxMetaData.max.sensorValues, selectedSensorValueType, formula)
			} else {
				const value = sourceNodeMetaData.sensorValues[selectedSensorValueType]
				const total = totalAndMaxMetaData.total.sensorValues[selectedSensorValueType]
				const relativeToTotal = total === 0 ? 0 : value / total
				const formattedValue = SensorValueFormatHelper.format(
					value,
					selectedSensorValueType
				)
				message =
					SensorValueTypeNames[selectedSensorValueType] +
					`: ${formattedValue.value} ${formattedValue.unit} ` +
					`(${relativeToTotal.toFixed(PROFILE_PERCENT_PRECISION)}%)`
				weight = value / totalAndMaxMetaData.max.sensorValues[selectedSensorValueType]
			}

			yield TextDocumentHighlighter.highlightLine(
				editor,
				beginLoc.line - 1,
				message,
				weight,
				sourceNodeMetaData.sensorValues,
				profile
			)
		}
	}

}
