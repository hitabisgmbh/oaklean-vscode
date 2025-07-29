import { useEffect, useState } from 'react'
import {
	provideVSCodeDesignSystem,
	allComponents
} from '@vscode/webview-ui-toolkit'

import { MethodTree } from '../components/trees/MethodTree/MethodTree'
import {
	MethodViewCommands,
	MethodViewProtocol_ParentToChild
} from '../../protocols/methodViewProtocol'
import { ISourceFileMethodTree } from '../../types/model/SourceFileMethodTree'
import { SensorValueRepresentation } from '../../types/sensorValueRepresentation'
import TreeView from '../components/trees/Treeview'
import { TreeViewHeader } from '../components/trees/MethodTree/TreeViewHeader'
import { CodiconButton } from '../components/buttons/CodiconButton'
import { SensorValueFormatHelper } from '../../helper/SensorValueFormatHelper'

declare const acquireVsCodeApi: any

provideVSCodeDesignSystem().register(allComponents)

export const vscode = acquireVsCodeApi()

function postToProvider(message: { command: string }) {
	vscode.postMessage(message)
}

type Props = {
	methodTrees: Record<
		string,
		{
			fileName: string
			tree: ISourceFileMethodTree
		}
	>
	sensorValueRepresentation: SensorValueRepresentation
}

export function App() {
	const [props, setProps] = useState<Props>()

	function handleExtensionMessages(message: {
		data: MethodViewProtocol_ParentToChild
	}) {
		switch (message.data.command) {
			case MethodViewCommands.createMethodList:
				setProps({
					methodTrees: message.data.methodTrees,
					sensorValueRepresentation: message.data.sensorValueRepresentation
				})
				break
			case MethodViewCommands.clearMethodList:
				setProps(undefined)
				break
		}
	}

	useEffect(() => {
		window.addEventListener('message', handleExtensionMessages)
		postToProvider({ command: MethodViewCommands.initMethods })

		return () => {
			window.removeEventListener('message', handleExtensionMessages)
		}
	}, [])

	const [flatMode, setFlatMode] = useState(true)

	const [showNPIOSC, setShowNPIOSC] = useState(false)

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
			{props === undefined
				? undefined
				: Object.entries(props.methodTrees || {}).map(([path, entry]) => {
						if (entry.tree.pioscChildrenCount === 0 && !showNPIOSC) {
							return undefined
						}

						return (
							<TreeView nodeLabel={entry.fileName} itemClassName="row">
								<MethodTree
									props={{
										flatMode,
										showNPIOSC: showNPIOSC,
										filePath: path,
										sourceFileMethodTree: entry.tree,
										sensorValueRepresentation: props.sensorValueRepresentation,
										postToProvider
									}}
								/>
							</TreeView>
						)
				})}
		</>
	)
}
