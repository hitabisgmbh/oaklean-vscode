import {
	ProgramStructureTreeType,
	SourceNodeIdentifierPart_string
} from '@oaklean/profiler-core/dist/src/types'
import { SourceNodeIdentifierHelper } from '@oaklean/profiler-core/dist/src/helper/SourceNodeIdentifierHelper'
import React from 'react'

import './MethodTree.css'
import { MethodTreeEntry } from './MethodTreeEntry'
import { TreeViewHeader } from './TreeViewHeader'

import { CodiconButton } from '../../buttons/CodiconButton'
import {
	EditorFileMethodViewCommands,
	EditorFileMethodViewProtocol_ChildToParent
} from '../../../../protocols/editorFileMethodViewProtocol'
import { calcOrReturnSensorValue } from '../../../../helper/FormulaHelper'
import { SensorValueFormatHelper } from '../../../../helper/SensorValueFormatHelper'
import TreeView from '../Treeview'
import { ISourceFileMethodTree } from '../../../../types/model/SourceFileMethodTree'
import { SensorValueRepresentation } from '../../../../types/sensorValueRepresentation'



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
	sensorValueRepresentation: SensorValueRepresentation
	postToProvider: (message: EditorFileMethodViewProtocol_ChildToParent) => void
	flat: boolean
}

export function MethodTree({ props }: { props?: MethodTreeProps }) {
	const [
		flatMode,
		setFlatMode
	] = React.useState(props?.flat || false)

	const [
		showNonPresentInOriginalSourceCode,
		setShowNonPresentInOriginalSourceCode
	] = React.useState(false)

	let i = 0
	if (props === undefined) {
		return <div className="method-tree">No data available for this file</div>
	}

	return (
		<div className="method-tree">
			<TreeViewHeader buttons={
				<>
					<CodiconButton codiconName={
						flatMode ?
							'codicon-list-flat' :
							'codicon-list-tree'}
						onClick={() => {
							setFlatMode((prev) => !prev)
						}}
						title='Show flat/tree view of the methods'
					></CodiconButton>
					<CodiconButton codiconName={
					showNonPresentInOriginalSourceCode ?
						'codicon-eye' :
						'codicon-eye-closed'}
					onClick={() => {
						setShowNonPresentInOriginalSourceCode((prev) => !prev)
					}}
					title='Show/Hide source locations that existed only during runtime'
					></CodiconButton>
				</>
			}/>
			{Object.entries(props.sourceFileMethodTree.children).map(
				([identifierPart, child]) =>
					renderNode(
						showNonPresentInOriginalSourceCode,
						[identifierPart as SourceNodeIdentifierPart_string],
						child,
						props.sensorValueRepresentation
					)
			)}
		</div>
	)

	function renderNode(
		showNonPresentInOriginalSourceCode: boolean,
		identifierRoute: SourceNodeIdentifierPart_string[],
		sourceFileMethodTree: ISourceFileMethodTree,
		sensorValueRepresentation: SensorValueRepresentation
	): React.JSX.Element {
		if (
			sourceFileMethodTree.presentInOriginalSourceCode === false &&
			!showNonPresentInOriginalSourceCode
		) {
			return <></>
		}

		if (identifierRoute.length === 0) {
			return <div className="method-tree">No identifier provided</div>
		}
		const identifierPart = identifierRoute[identifierRoute.length - 1]

		const children = Object.entries(sourceFileMethodTree.children || {})
		if (identifierPart === '{root}' || (flatMode && children.length > 0)) {
			return (
				<>
					{Object.entries(sourceFileMethodTree.children).map(
						([identifierPart, child]) =>
							renderNode(
								showNonPresentInOriginalSourceCode,
								[
									...identifierRoute,
									identifierPart as SourceNodeIdentifierPart_string
								],
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
		const labelIcon =
			result?.type !== undefined
				? IDENTIFIER_TYPE_CODICONS[result.type]
				: 'codicon-question'

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
			<MethodTreeEntry
				onClick={() => {
					props?.postToProvider({
						command: EditorFileMethodViewCommands.open,
						identifier: identifierRoute.join('.')
					})
				}}
				labelCodicon={labelIcon}
				showNPIOSCMarker={
					!sourceFileMethodTree.presentInOriginalSourceCode
				}
				labelText={labelText}
				sensorValueString={sensorValueString}
			/>
		)

		
		if (children.length === 0) {
			return (
				<div key={i++} className="leaf-node row" data-name={identifierPart}>
					{identifierLabel}
				</div>
			)
		} else {
			return (
				<div data-name={identifierPart} key={i++}>
					<TreeView nodeLabel={identifierLabel} itemClassName="row">
						{children.map(([childIdentifierPart, child]) =>
							renderNode(
								showNonPresentInOriginalSourceCode,
								[
									...identifierRoute,
									childIdentifierPart as SourceNodeIdentifierPart_string
								],
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
