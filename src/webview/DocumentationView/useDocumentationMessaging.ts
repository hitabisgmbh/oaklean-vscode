import { useEffect } from 'react'

import {
	DocumentationViewCommands,
	DocumentationView_ParentToChild
} from '../../protocols/DocumentationViewProtocol'

type InitMessage = Extract<
	DocumentationView_ParentToChild,
	{ type: DocumentationViewCommands.init }
>
type OpenMessage = Extract<
	DocumentationView_ParentToChild,
	{ type: DocumentationViewCommands.open }
>

export function useDocumentationMessaging(
	vscodeApi: { postMessage: (message: unknown) => void },
	onInit: (message: InitMessage) => void,
	onOpen: (message: OpenMessage) => void
): void {
	useEffect(() => {
		function handleMessages(
			event: MessageEvent<DocumentationView_ParentToChild>
		) {
			const message = event.data
			switch (message?.type) {
				case DocumentationViewCommands.init:
					onInit(message)
					break
				case DocumentationViewCommands.open:
					onOpen(message)
					break
			}
		}

		window.addEventListener('message', handleMessages)
		vscodeApi.postMessage({ type: DocumentationViewCommands.requestDocs })

		return () => window.removeEventListener('message', handleMessages)
	}, [onInit, onOpen, vscodeApi])
}
