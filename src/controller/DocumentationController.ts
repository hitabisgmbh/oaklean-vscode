import { Buffer } from 'buffer'

import vscode from 'vscode'

import { Container } from '../container'
import type { DocumentationEntry } from '../types/documentation'

// Loads and caches documentation files from the extension.
export default class DocumentationController implements vscode.Disposable {
	// Cached docs to avoid repeated FS reads.
	private docs: DocumentationEntry[] = []
	// Resolved docs root path (memoized).
	private docsRoot: vscode.Uri | null = null
	// Candidate roots checked in order.
	private readonly docsRootCandidates: vscode.Uri[]

	// Input: Container (extension context). Output: controller with docs root candidates.
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

	// Input: none. Output: all docs, cached after first load.
	async getAllDocs(): Promise<DocumentationEntry[]> {
		if (this.docs.length === 0) {
			// Load once and cache for the session.
			const root = await this.resolveDocsRoot()
			this.docs = await this.loadDocsRecursive(root)
		}
		return this.docs
	}

	// Input: none. Output: resolved docs root folder.
	async getDocsRoot(): Promise<vscode.Uri> {
		return this.resolveDocsRoot()
	}

	// Input: none. Output: void (required by vscode.Disposable).
	dispose(): void {
		// nothing
	}

	// Input: none. Output: first existing docs root candidate.
	private async resolveDocsRoot(): Promise<vscode.Uri> {
		// Resolve docs root once; prefer workspace docs over bundled docs.
		if (this.docsRoot !== null) {
			return this.docsRoot
		}
		for (const candidate of this.docsRootCandidates) {
			if (await this.isDirectory(candidate)) {
				this.docsRoot = candidate
				return candidate
			}
		}
		this.docsRoot = this.docsRootCandidates[this.docsRootCandidates.length - 1]
		return this.docsRoot
	}

	// Input: URI. Output: true if directory exists.
	private async isDirectory(uri: vscode.Uri): Promise<boolean> {
		try {
			const stat = await vscode.workspace.fs.stat(uri)
			return (stat.type & vscode.FileType.Directory) !== 0
		} catch {
			return false
		}
	}

	// Input: directory URI + relative base. Output: docs found under that tree.
	private async loadDocsRecursive(
		dir: vscode.Uri,
		relativeBase = ''
	): Promise<DocumentationEntry[]> {
		// Walk the docs tree and collect markdown files with metadata.
		let entries: [string, vscode.FileType][]
		try {
			entries = await vscode.workspace.fs.readDirectory(dir)
		} catch {
			return []
		}

		const docs: DocumentationEntry[] = []
		for (const [name, type] of entries) {
			const childUri = vscode.Uri.joinPath(dir, name)
			const relativePath =
				relativeBase !== '' ? `${relativeBase}/${name}` : name

			if (type === vscode.FileType.Directory) {
				const nested = await this.loadDocsRecursive(childUri, relativePath)
				docs.push(...nested)
			} else if (type === vscode.FileType.File && this.isMarkdown(name)) {
				// Capture mtime as a cheap version hint for search indexing.
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

	// Input: file name. Output: true if markdown extension.
	private isMarkdown(fileName: string): boolean {
		return /\.(md|markdown)$/i.test(fileName)
	}
}
