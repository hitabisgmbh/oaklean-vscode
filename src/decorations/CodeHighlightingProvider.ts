import vscode from 'vscode'
import {
	AggregatedSourceNodeMetaData,
	SourceNodeMetaData,
	SourceNodeMetaDataType
} from '@oaklean/profiler-core'

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
		if (editor.document.uri.scheme !== 'file') {
			// Only provide decorations for file URIs
			return
		}	
		const enableLineAnnotations = this._container.storage.getWorkspace(
			'enableLineAnnotations',
			true
		) as boolean
		if (enableLineAnnotations === false) {
			return
		}
		const sensorValueRepresentation = this._container.storage.getWorkspace(
			'sensorValueRepresentation'
		) as SensorValueRepresentation

		const relativeWorkspacePath = WorkspaceUtils.getRelativeWorkspacePath(
			editor.document.fileName
		)
		if (relativeWorkspacePath === undefined) {
			return []
		}
		const sourceFileInfo =
			this._container.textDocumentController.getSourceFileInformationOfFile(
				relativeWorkspacePath
			)
		const totalAndMaxMetaData =
			this._container.textDocumentController.totalAndMaxMetaData
		if (
			sourceFileInfo === undefined ||
			sourceFileInfo.sourceNodeMetaDataByLine === undefined ||
			totalAndMaxMetaData === undefined
		) {
			return []
		}

		for (const [
			lineNumber,
			sourceNodeMetaDatas
		] of sourceFileInfo.sourceNodeMetaDataByLine.entries()) {
			if (sourceNodeMetaDatas.length === 0) {
				continue
			}
			const sourceNodeMetaData = sourceNodeMetaDatas[0]

			const line = this.highlightSourceNode(
				sensorValueRepresentation,
				sourceNodeMetaData,
				totalAndMaxMetaData,
				editor,
				lineNumber
			)
			this.textDecorations.push(line.decoration)
			editor.setDecorations(line.decoration, line.decorationRanges)
		}
	}

	highlightSourceNode(
		sensorValueRepresentation: SensorValueRepresentation,
		sourceNodeMetaData: SourceNodeMetaData<SourceNodeMetaDataType>,
		totalAndMaxMetaData: AggregatedSourceNodeMetaData,
		editor: vscode.TextEditor,
		lineNumber: number
	): LineProfileDecoration {
		let message
		let importanceWeight: number
		if (sensorValueRepresentation.selectedSensorValueType === 'customFormula') {
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
			const relativeToTotalForFormula = (calculatedFormula / formulaTotal) * 100
			message =
				`${sensorValueRepresentation.formula}: ${formattedCalculatedFormula.value} ` +
				`(${relativeToTotalForFormula.toFixed(PROFILE_PERCENT_PRECISION)}%)`
			importanceWeight =
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
			importanceWeight =
				value /
				totalAndMaxMetaData.max.sensorValues[
					sensorValueRepresentation.selectedSensorValueType
				]
		}

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
