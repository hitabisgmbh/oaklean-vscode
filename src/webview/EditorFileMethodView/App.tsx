import { useEffect, useState } from 'react'

import { MethodTree } from '../components/trees/MethodTree/MethodTree'
import {
	EditorFileMethodViewProtocolCommands,
	EditorFileMethodViewProtocol_ChildToParent,
	EditorFileMethodViewProtocol_ParentToChild
} from '../../protocols/EditorFileMethodViewProtocol'
import { ISourceFileMethodTree } from '../../types/model/SourceFileMethodTree'
import { SensorValueRepresentation } from '../../types/sensorValueRepresentation'
import { TreeViewHeader } from '../components/trees/MethodTree/TreeViewHeader'
import { CodiconButton } from '../components/buttons/CodiconButton'
import { SensorValueFormatHelper } from '../../helper/SensorValueFormatHelper'
import { SortButton } from '../components/buttons/SortButton'
import { SortDirection } from '../../types/sortDirection'

declare const acquireVsCodeApi: any

export const vscode = acquireVsCodeApi()

function postToProvider(message: EditorFileMethodViewProtocol_ChildToParent) {
	vscode.postMessage(message)
}

type Props = {
	debugMode: boolean
	sourceFileMethodTree: ISourceFileMethodTree
	sensorValueRepresentation: SensorValueRepresentation
}

export function App() {
	const [props, setProps] = useState<Props>()

	function handleExtensionMessages(message: {
		data: EditorFileMethodViewProtocol_ParentToChild
	}) {
		switch (message.data.command) {
			case EditorFileMethodViewProtocolCommands.updateMethodList:
				setProps({
					debugMode: message.data.debugMode,
					sourceFileMethodTree: message.data.sourceFileMethodTree,
					sensorValueRepresentation: message.data.sensorValueRepresentation
				})
				break
			case EditorFileMethodViewProtocolCommands.clearMethodList:
				setProps(undefined)
				break
		}
	}

	const [sortDirection, setSortDirection] = useState(SortDirection.default)
	const [flatMode, setFlatMode] = useState(false)
	const [showNPIOSC, setShowNPIOSC] = useState(false)

	useEffect(() => {
		window.addEventListener('message', handleExtensionMessages)
		postToProvider({
			command: EditorFileMethodViewProtocolCommands.initMethods
		})

		return () => {
			window.removeEventListener('message', handleExtensionMessages)
		}
	}, [])

	return (
		<>
			<TreeViewHeader
				leftSection={
					<div>
						{props === undefined
							? ''
							: SensorValueFormatHelper.formatSensorValueType(
									props.sensorValueRepresentation
								)}
					</div>
				}
				rightSection={
					<>
						{props !== undefined && props.debugMode ? (
							<CodiconButton
								codiconName={'codicon-file-text highlighted'}
								onClick={() => {
									postToProvider({
										command:
											EditorFileMethodViewProtocolCommands.showPathIndex
									})
								}}
								title="Show index of the source file"
							></CodiconButton>
						) : undefined}
						<SortButton
							sortDirection={sortDirection}
							setSortDirection={setSortDirection}
						/>
						<CodiconButton
							codiconName={flatMode ? 'codicon-list-flat' : 'codicon-list-tree'}
							onClick={() => {
								setFlatMode((prev) => !prev)
							}}
							title="Show flat/tree view of the methods"
						></CodiconButton>
						<CodiconButton
							codiconName={showNPIOSC ? 'codicon-eye' : 'codicon-eye-closed'}
							onClick={() => {
								setShowNPIOSC((prev) => !prev)
							}}
							title="Show/Hide source locations that existed only during runtime"
						></CodiconButton>
					</>
				}
			/>
			<MethodTree
				showNPIOSC={showNPIOSC}
				flatMode={flatMode}
				sortDirection={sortDirection}
				data={
					props !== undefined
						? {
								relativePath: '',
								sourceFileMethodTree: props.sourceFileMethodTree,
								sensorValueRepresentation: props.sensorValueRepresentation,
								postToProvider
							}
						: undefined
				}
			/>
		</>
	)
}
