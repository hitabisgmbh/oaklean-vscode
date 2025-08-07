import {
	ProgramStructureTreeType,
	SourceNodeIdentifierPart_string
} from '@oaklean/profiler-core/dist/src/types'
import { SourceNodeIdentifierHelper } from '@oaklean/profiler-core/dist/src/helper/SourceNodeIdentifierHelper'
import React from 'react'

import './MethodTree.css'
import { MethodTreeEntry } from './MethodTreeEntry'

import {
	OpenSourceLocationProtocolCommands,
	OpenSourceLocationProtocol_ChildToParent
} from '../../../../protocols/OpenSourceLocationProtocol'
import { calcOrReturnSensorValue } from '../../../../helper/FormulaHelper'
import { SensorValueFormatHelper } from '../../../../helper/SensorValueFormatHelper'
import TreeView from '../Treeview'
import { ISourceFileMethodTree } from '../../../../types/model/SourceFileMethodTree'
import { SensorValueRepresentation } from '../../../../types/sensorValueRepresentation'
import { SortDirection } from '../../../../types/sortDirection'

type NodeEntry = {
	sortValue: number
	node: React.JSX.Element
}

function sortNodeEntries(
	nodes: NodeEntry[],
	sortDirection: SortDirection = SortDirection.asc
) {
	if (sortDirection === SortDirection.asc) {
		nodes.sort((a, b) => {
			return a.sortValue - b.sortValue
		})
	} else if (sortDirection === SortDirection.desc) {
		nodes.sort((a, b) => {
			return b.sortValue - a.sortValue
		})
	}
}

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
	data?: {
		relativePath: string
		sourceFileMethodTree: ISourceFileMethodTree
		sensorValueRepresentation: SensorValueRepresentation
		postToProvider: (
			message: OpenSourceLocationProtocol_ChildToParent
		) => void
	}
	showNPIOSC: boolean
	flatMode: boolean
	sortDirection: SortDirection
}

export function MethodTree({
	data,
	showNPIOSC,
	flatMode,
	sortDirection
}: MethodTreeProps) {
	let i = 0
	if (data === undefined) {
		return <div className="method-tree">No data available for this file</div>
	}

	const { nodes } = renderChildren(
		data.sourceFileMethodTree,
		[],
		data.sensorValueRepresentation
	)
	sortNodeEntries(nodes, sortDirection)

	return (
		<div className="method-tree">
			{nodes.map((nodeEntry) => nodeEntry.node)}
		</div>
	)

	function renderChildren(
		sourceFileMethodTree: ISourceFileMethodTree,
		identifierRoute: SourceNodeIdentifierPart_string[] = [],
		sensorValueRepresentation: SensorValueRepresentation
	): {
		nodes: NodeEntry[]
		sum: number
	} {
		const nodes: NodeEntry[] = []
		let sum = 0
		for (const [identifierPart, child] of Object.entries(
			sourceFileMethodTree.children
		)) {
			const entry = renderNode(
				[...identifierRoute, identifierPart as SourceNodeIdentifierPart_string],
				child,
				sensorValueRepresentation
			)
			nodes.push(entry)
			sum += entry.sortValue
		}
		return { nodes, sum }
	}

	function renderNode(
		identifierRoute: SourceNodeIdentifierPart_string[],
		sourceFileMethodTree: ISourceFileMethodTree,
		sensorValueRepresentation: SensorValueRepresentation
	): NodeEntry {
		if (sourceFileMethodTree.piosc === undefined && !showNPIOSC) {
			return {
				sortValue: 0,
				node: <></>
			}
		}

		if (identifierRoute.length === 0) {
			return {
				sortValue: 0,
				node: <div className="method-tree">No identifier provided</div>
			}
		}
		const identifierPart = identifierRoute[identifierRoute.length - 1]

		const children = Object.entries(sourceFileMethodTree.children || {})
		if (identifierPart === '{root}' || (flatMode && children.length > 0)) {
			const { nodes, sum } = renderChildren(
				sourceFileMethodTree,
				identifierRoute,
				sensorValueRepresentation
			)
			sortNodeEntries(nodes, sortDirection)

			return {
				node: <>{nodes.map((node) => node.node)}</>,
				sortValue: sum
			}
		}

		const result =
			SourceNodeIdentifierHelper.parseSourceNodeIdentifierPart(identifierPart)

		const labelText = result?.name || 'UNKNOWN'
		const labelIcon =
			result?.type !== undefined
				? IDENTIFIER_TYPE_CODICONS[result.type]
				: 'codicon-question'

		let sensorValueString: string | undefined = undefined
		let sensorValueUnit: string | undefined = undefined
		// sum of sensor values of this node and all children
		let sensorValueAcc = 0

		if (sourceFileMethodTree.sourceNodeMetaData) {
			const sensorValue = calcOrReturnSensorValue(
				sourceFileMethodTree.sourceNodeMetaData.sensorValues,
				sensorValueRepresentation
			)
			const formattedSensorValue = SensorValueFormatHelper.format(
				sensorValue,
				sensorValueRepresentation.selectedSensorValueType
			)
			sensorValueUnit = formattedSensorValue.unit
			sensorValueString = formattedSensorValue.value
			sensorValueAcc += Number(formattedSensorValue.value)
		}

		const { nodes, sum } = renderChildren(
			sourceFileMethodTree,
			identifierRoute,
			sensorValueRepresentation
		)
		sensorValueAcc += sum

		const identifierLabel = (
			<MethodTreeEntry
				onClick={() => {
					data?.postToProvider({
						relativePath: data.relativePath,
						command: OpenSourceLocationProtocolCommands.openSourceLocation,
						identifier: identifierRoute.join('.')
					})
				}}
				labelCodicon={labelIcon}
				showNPIOSCMarker={sourceFileMethodTree.piosc === undefined}
				labelText={labelText}
				sensorValue={sensorValueString}
				sensorValueUnit={sensorValueUnit}
			/>
		)

		if (nodes.length === 0) {
			return {
				node: (
					<div key={i++} className="leaf-node row" data-name={identifierPart}>
						{identifierLabel}
					</div>
				),
				sortValue: sensorValueAcc
			}
		} else {
			sortNodeEntries(nodes, sortDirection)

			return {
				node: (
					<div data-name={identifierPart} key={i++}>
						<TreeView nodeLabel={identifierLabel} itemClassName="row">
							{nodes.map((node) => node.node)}
						</TreeView>
					</div>
				),
				sortValue: sensorValueAcc
			}
		}
	}
}
