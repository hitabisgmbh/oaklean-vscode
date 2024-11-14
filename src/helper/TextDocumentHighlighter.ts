import vscode, { TextEditor, TextEditorDecorationType } from 'vscode'
import { SensorValues, UnifiedPath } from '@oaklean/profiler-core'

import { calcOrReturnSensorValue } from './FormulaHelper'
import { SensorValueFormatHelper } from './SensorValueFormatHelper'

import { pad } from '../system/string'
import { getImportanceColor } from '../system/color'
import { GlyphChars } from '../constants/characters'
import { PROFILE_PERCENT_PRECISION } from '../constants/profile'
import { Container } from '../container'
import { ExtendedSensorValueType, SensorValueTypeNames } from '../types/sensorValues'
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
				color: '#ffffffff',
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
			const value = sourceNodeMetaData.sensorValues[selectedSensorValueType]
			const locationOfFunction =
				programStructureTreeOfFile.sourceLocationOfIdentifier(sourceNodeIndex.identifier)
			if (!locationOfFunction) {
				continue
			}
			const { beginLoc } = locationOfFunction
			const total = totalAndMaxMetaData.total.sensorValues[selectedSensorValueType]
			const relativeToToal = total === 0 ? 0 : value / total
			let message
			let weigth
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
				const relativeToToalForFormula = calculatedFormula / formulaTotal
				message = `${formula}: ${formattedCalculatedFormula.value} ` +
					`(${relativeToToalForFormula.toFixed(PROFILE_PERCENT_PRECISION)}%)`
				weigth = calculatedFormula / calcOrReturnSensorValue(
					totalAndMaxMetaData.max.sensorValues, selectedSensorValueType, formula)
			} else {
				const formattedValue = SensorValueFormatHelper.format(
					value,
					selectedSensorValueType
				)
				message =
					SensorValueTypeNames[selectedSensorValueType] +
					`: ${formattedValue.value} ${formattedValue.unit} ` +
					`(${relativeToToal.toFixed(PROFILE_PERCENT_PRECISION)}%)`
				weigth = value / totalAndMaxMetaData.max.sensorValues[selectedSensorValueType]
			}

			yield TextDocumentHighlighter.highlightLine(
				editor,
				beginLoc.line - 1,
				message,
				weigth,
				sourceNodeMetaData.sensorValues,
				profile
			)
		}
	}

}
