import { useEffect, useState } from 'react'
import { provideVSCodeDesignSystem, allComponents } from '@vscode/webview-ui-toolkit'

import { MethodTree } from './components/MethodTree'

import {
	EditorFileMethodViewCommands,
	EditorFileMethodViewProtocol_ChildToParent,
	EditorFileMethodViewProtocol_ParentToChild
} from '../../protocols/editorFileMethodViewProtocol'
import { ISourceFileMethodTree } from '../../types/model/SourceFileMethodTree'
import { SensorValueRepresentation } from '../../types/sensorValueRepresentation'


declare const acquireVsCodeApi: any

provideVSCodeDesignSystem().register(allComponents)

export const vscode = acquireVsCodeApi()

function postToProvider(message: EditorFileMethodViewProtocol_ChildToParent){
	vscode.postMessage(message)
}

type Props = {
	sourceFileMethodTree: ISourceFileMethodTree,
	sensorValueRepresentation: SensorValueRepresentation
}

export function App() {
	const [props, setProps] = useState<Props>()

	function handleExtensionMessages(message: {
		data: EditorFileMethodViewProtocol_ParentToChild
	}) {
		switch (message.data.command) {
			case EditorFileMethodViewCommands.createMethodList:
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

	useEffect(() => {
		window.addEventListener('message', handleExtensionMessages)
		postToProvider({ command: EditorFileMethodViewCommands.initMethods })

		return () => {
			window.removeEventListener('message', handleExtensionMessages)
		}
	}, [])

	return (
		<>
			<MethodTree props={props !== undefined ? {
				sourceFileMethodTree: props.sourceFileMethodTree,
				sensorValueRepresentation: props.sensorValueRepresentation,
				postToProvider
			} : undefined}/>
		</>
	)
}
