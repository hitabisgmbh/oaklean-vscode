import { Buffer } from 'buffer'

import vscode from 'vscode'

import { Container } from '../container'

export interface DocumentationEntry {
	path: string
	name: string
	content: string
	version?: number
}

export default class DocumentationController implements vscode.Disposable {
	private docs: DocumentationEntry[] = []
	private docsRoot: vscode.Uri | null = null
	private readonly docsRootCandidates: vscode.Uri[]

	constructor(container: Container) {
		// Prefer workspace docs to match Markdown preview; fall back to build output.
		this.docsRootCandidates = [
			vscode.Uri.joinPath(container.context.extensionUri, 'docs'),
			vscode.Uri.joinPath(
				container.context.extensionUri,
				'dist',
				'extension',
				'docs'
			)
		]
	}

	async getAllDocs(): Promise<DocumentationEntry[]> {
		if (this.docs.length === 0) {
			const root = await this.resolveDocsRoot()
			this.docs = await this.loadDocsRecursive(root)

			// Debuging output
			//console.debug(`Loaded ${this.docs.length} documentation files from ${this.docsRoot.toString()}`)
		}
		return this.docs
	}

	async getDocsRoot(): Promise<vscode.Uri> {
		return this.resolveDocsRoot()
	}

	dispose(): void {
		// nothing
	}

	private async resolveDocsRoot(): Promise<vscode.Uri> {
		if (this.docsRoot) return this.docsRoot
		for (const candidate of this.docsRootCandidates) {
			if (await this.isDirectory(candidate)) {
				this.docsRoot = candidate
				return candidate
			}
		}
		this.docsRoot = this.docsRootCandidates[this.docsRootCandidates.length - 1]
		return this.docsRoot
	}

	private async isDirectory(uri: vscode.Uri) {
		try {
			const stat = await vscode.workspace.fs.stat(uri)
			return (stat.type & vscode.FileType.Directory) !== 0
		} catch {
			return false
		}
	}

	private async loadDocsRecursive(
		dir: vscode.Uri,
		relativeBase = ''
	): Promise<DocumentationEntry[]> {
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
				const stat = await vscode.workspace.fs.stat(childUri)
				const contentBuffer = await vscode.workspace.fs.readFile(childUri)
				const content = Buffer.from(contentBuffer).toString('utf8')
				docs.push({
					path: relativePath,
					name,
					content,
					version: stat.mtime
				})
			}
		}

		return docs
	}

	private isMarkdown(fileName: string) {
		return /\.(md|markdown)$/i.test(fileName)
	}
}
