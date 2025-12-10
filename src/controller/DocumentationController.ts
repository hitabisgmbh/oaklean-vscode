import vscode from 'vscode'
import { Buffer } from 'buffer'

import { Container } from '../container'

export interface DocumentationEntry {
	path: string
	name: string
	content: string
}

export default class DocumentationController implements vscode.Disposable {
	private docs: DocumentationEntry[] = []
	private readonly docsRoot: vscode.Uri

	constructor(container: Container) {
		// NB: read from build output (webpack copies docs to dist/extension/docs)
		
		this.docsRoot = vscode.Uri.joinPath(container.context.extensionUri, 'dist', 'extension', 'docs')
	}

	async getAllDocs(): Promise<DocumentationEntry[]> {
		if (this.docs.length === 0) {
			this.docs = await this.loadDocsRecursive(this.docsRoot)
			
			// Debuging output
			//console.debug(`Loaded ${this.docs.length} documentation files from ${this.docsRoot.toString()}`)
		}
		return this.docs
	}

	dispose(): void {
		// nothing 
	}

	private async loadDocsRecursive(dir: vscode.Uri, relativeBase = ''): Promise<DocumentationEntry[]> {
		let entries: [string, vscode.FileType][]
		try {
			entries = await vscode.workspace.fs.readDirectory(dir)
		} catch {
			return []
		}

		const docs: DocumentationEntry[] = []
		for (const [name, type] of entries) {
			const childUri = vscode.Uri.joinPath(dir, name)
			const relativePath = relativeBase ? `${relativeBase}/${name}` : name

			if (type === vscode.FileType.Directory) {
				const nested = await this.loadDocsRecursive(childUri, relativePath)
				docs.push(...nested)
			} else if (type === vscode.FileType.File && this.isMarkdown(name)) {
				const contentBuffer = await vscode.workspace.fs.readFile(childUri)
				const content = Buffer.from(contentBuffer).toString('utf8')
				docs.push({
					path: relativePath,
					name,
					content
				})
			}
		}

		return docs
	}

	private isMarkdown(fileName: string) {
		return /\.(md|markdown)$/i.test(fileName)
	}
}
