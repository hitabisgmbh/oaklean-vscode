import { useEffect, useState } from 'react'

import { MethodTree } from '../components/trees/MethodTree/MethodTree'
import {
	EditorFileMethodViewCommands,
	EditorFileMethodViewProtocol_ChildToParent,
	EditorFileMethodViewProtocol_ParentToChild
} from '../../protocols/editorFileMethodViewProtocol'
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
	sourceFileMethodTree: ISourceFileMethodTree
	sensorValueRepresentation: SensorValueRepresentation
}

export function App() {
	const [props, setProps] = useState<Props>()

	function handleExtensionMessages(message: {
		data: EditorFileMethodViewProtocol_ParentToChild
	}) {
		switch (message.data.command) {
			case EditorFileMethodViewCommands.updateMethodList:
				setProps({
					sourceFileMethodTree: message.data.sourceFileMethodTree,
					sensorValueRepresentation: message.data.sensorValueRepresentation
				})
				break
			case EditorFileMethodViewCommands.clearMethodList:
				setProps(undefined)
				break
		}
	}

	const [sortDirection, setSortDirection] = useState(SortDirection.default)
	const [flatMode, setFlatMode] = useState(false)
	const [showNPIOSC, setShowNPIOSC] = useState(false)

	useEffect(() => {
		window.addEventListener('message', handleExtensionMessages)
		postToProvider({ command: EditorFileMethodViewCommands.initMethods })

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
						<SortButton sortDirection={sortDirection} setSortDirection={setSortDirection}/>
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
								filePath: '',
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
