import type { Document } from 'flexsearch'

import type { DocumentationFile } from '../protocols/DocumentationViewProtocol'

export type FolderNode = {
	name: string
	path: string
	folders: FolderNode[]
	files: DocumentationFile[]
	indexFile?: DocumentationFile
}

export type BreadcrumbItem = {
	label: string
	path: string
	clickable: boolean
}

export type SearchResult = {
	path: string
	name: string
	snippet: string
	occurrence: number
}

export type DocumentationSearchDocument = {
	path: string
	name: string
	content: string
}

export type DocumentationSearchIndex = Document<DocumentationSearchDocument>
