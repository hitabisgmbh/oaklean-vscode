import { useEffect, useState } from 'react'

import {
	EditorFileMethodReferenceViewProtocolCommands,
	EditorFileMethodReferenceViewProtocol_ChildToParent,
	EditorFileMethodReferenceViewProtocol_ParentToChild
} from '../../protocols/EditorFileMethodReferenceViewProtocol'
import { ISourceFileMethodTree } from '../../types/model/SourceFileMethodTree'
import { SensorValueRepresentation } from '../../types/sensorValueRepresentation'
import { SortDirection } from '../../types/sortDirection'

declare const acquireVsCodeApi: any

export const vscode = acquireVsCodeApi()

function postToProvider(message: EditorFileMethodReferenceViewProtocol_ChildToParent) {
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
		data: EditorFileMethodReferenceViewProtocol_ParentToChild
	}) {
		switch (message.data.command) {
			case EditorFileMethodReferenceViewProtocolCommands.updateMethodList:
				setProps({
					debugMode: message.data.debugMode,
					sourceFileMethodTree: message.data.sourceFileMethodTree,
					sensorValueRepresentation: message.data.sensorValueRepresentation
				})
				break
			case EditorFileMethodReferenceViewProtocolCommands.clearMethodList:
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
			command: EditorFileMethodReferenceViewProtocolCommands.initMethods
		})

		return () => {
			window.removeEventListener('message', handleExtensionMessages)
		}
	}, [])

	return (
		<>
			
		</>
	)
}
