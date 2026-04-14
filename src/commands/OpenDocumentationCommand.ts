import BaseCommand from './BaseCommand'

import { Container } from '../container'
import { DocumentationViewPanel } from '../panels/DocumentationViewPanel'

export const IDENTIFIER = 'showDocs'

export default class OpenDocumentationCommand extends BaseCommand {
	container: Container

	constructor(container: Container) {
		super()
		this.container = container
	}

	getIdentifier(): string {
		return IDENTIFIER
	}

	async execute(): Promise<void> {
		await this.openDocsWebview()
	}

	dispose() {
		// No resources to dispose
	}

	private async openDocsWebview(): Promise<void> {
		DocumentationViewPanel.render(this.container)
	}
}
