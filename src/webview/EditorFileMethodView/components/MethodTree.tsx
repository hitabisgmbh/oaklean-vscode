import {
	ProgramStructureTreeType,
	SourceNodeIdentifierPart_string
} from '@oaklean/profiler-core/dist/src/types'
import { SourceNodeIdentifierHelper } from '@oaklean/profiler-core/dist/src/helper/SourceNodeIdentifierHelper'
import React from 'react'

import {
	EditorFileMethodViewCommands,
	EditorFileMethodViewProtocol_ChildToParent
} from '../../../protocols/editorFileMethodViewProtocol'
import { calcOrReturnSensorValue } from '../../../helper/FormulaHelper'
import { SensorValueFormatHelper } from '../../../helper/SensorValueFormatHelper'
import TreeView from '../../components/Treeview'
import { ISourceFileMethodTree } from '../../../types/model/SourceFileMethodTree'
import { SensorValueRepresentation } from '../../../types/sensorValueRepresentation'
import './MethodTree.css'

const IDENTIFIER_TYPE_CODICONS: Record<ProgramStructureTreeType, string> = {
	[ProgramStructureTreeType.Root]: 'codicon-symbol-namespace',
	[ProgramStructureTreeType.ClassDeclaration]: 'codicon-symbol-class',
	[ProgramStructureTreeType.ClassExpression]: 'codicon-symbol-class',
	[ProgramStructureTreeType.FunctionDeclaration]: 'codicon-symbol-function',
	[ProgramStructureTreeType.FunctionExpression]: 'codicon-symbol-function',
	[ProgramStructureTreeType.ConstructorDeclaration]:
		'codicon-symbol-constructor',
	[ProgramStructureTreeType.MethodDefinition]: 'codicon-symbol-method',
	[ProgramStructureTreeType.IfStatement]: 'codicon-symbol-structure',
	[ProgramStructureTreeType.IfThenStatement]: 'codicon-symbol-structure',
	[ProgramStructureTreeType.IfElseStatement]: 'codicon-symbol-structure',
	[ProgramStructureTreeType.SwitchStatement]: 'codicon-symbol-structure',
	[ProgramStructureTreeType.SwitchCaseClause]: 'codicon-symbol-structure',
	[ProgramStructureTreeType.ObjectLiteralExpression]: 'codicon-symbol-object'
}

export interface MethodTreeProps {
	sourceFileMethodTree: ISourceFileMethodTree
	sensorValueRepresentation: SensorValueRepresentation,
	postToProvider: (message: EditorFileMethodViewProtocol_ChildToParent) => void
}

export function MethodTree({ props }: { props?: MethodTreeProps }) {
	let i = 0
	if (props === undefined) {
		return <div className='methodTreeView'>No data available for this file</div>
	}

	return (
		<div className='methodTreeView'>
			{Object.entries(props.sourceFileMethodTree.children).map(
				([identifierPart, child]) =>
					renderNode(
						[identifierPart as SourceNodeIdentifierPart_string],
						child,
						props.sensorValueRepresentation
					)
			)}
		</div>
	)

	function renderNode(
		identifierRoute: SourceNodeIdentifierPart_string[],
		sourceFileMethodTree: ISourceFileMethodTree,
		sensorValueRepresentation: SensorValueRepresentation
	): React.JSX.Element {
		if (identifierRoute.length === 0) {
			return <div className='methodTreeView'>No identifier provided</div>
		}
		const identifierPart = identifierRoute[identifierRoute.length - 1]

		if (identifierPart === '{root}') {
			return (
				<>
					{Object.entries(sourceFileMethodTree.children).map(
						([identifierPart, child]) =>
							renderNode(
								[...identifierRoute, identifierPart as SourceNodeIdentifierPart_string],
								child,
								sensorValueRepresentation
							)
					)}
				</>
			)
		}

		const result =
			SourceNodeIdentifierHelper.parseSourceNodeIdentifierPart(identifierPart)
		
		const labelText = result?.name || 'UNKNOWN'
		const labelIcon = result?.type !== undefined ? IDENTIFIER_TYPE_CODICONS[result.type] : 'codicon-question'

		let sensorValueString: string | undefined = undefined

		if (sourceFileMethodTree.sourceNodeMetaData) {
			const sensorValue = calcOrReturnSensorValue(
				sourceFileMethodTree.sourceNodeMetaData.sensorValues,
				sensorValueRepresentation
			)
			const formattedSensorValue = SensorValueFormatHelper.format(
				sensorValue,
				sensorValueRepresentation.selectedSensorValueType
			)
			sensorValueString = `${formattedSensorValue.value} ${formattedSensorValue.unit}`
		}

		const identifierLabel = (
			<div className='identifierLabel' onClick={() => {
				props?.postToProvider({
					command: EditorFileMethodViewCommands.open,
					identifier: identifierRoute.join('.')
				})
			}}>
				<span className={`icon codicon ${labelIcon}`}></span>
				<span className='text'>{labelText}</span>
				{sensorValueString ? (
					<>
						<span className='sensorValue'>{sensorValueString}</span>
					</>
				) : (
					''
				)}
			</div>
		)

		const children = Object.entries(sourceFileMethodTree.children || {})
		if (children.length === 0) {
			return (
				<div key={i++} className='leafNode row' data-name={identifierPart}>
					{identifierLabel}
				</div>
			)
		} else {
			return (
				<div data-name={identifierPart} key={i++}>
					<TreeView
						nodeLabel={identifierLabel}
						itemClassName='row'
					>
						{children.map(([childIdentifierPart, child]) =>
							renderNode(
								[...identifierRoute, childIdentifierPart as SourceNodeIdentifierPart_string],
								child,
								sensorValueRepresentation
							)
						)}
					</TreeView>
				</div>
			)
		}
	}
}
