import { Document } from 'flexsearch'

import { buildSnippetAt, normalizeSearchContent } from './markdownUtils'

import {
	SEARCH_INITIAL_OCCURRENCES_PER_DOC,
	SEARCH_RESULTS_MAX_DEFAULT,
	SEARCH_TOKEN_SEPARATOR
} from '../../constants/documentationSearch'
import type { DocumentationFile } from '../../protocols/DocumentationViewProtocol'
import type {
	DocumentationSearchDocument,
	DocumentationSearchIndex,
	DocumentationSearchMatch,
	SearchResult
} from '../../types/documentationView'

export function createSearchIndex(
	files: DocumentationFile[]
): DocumentationSearchIndex | null {
	if (files.length === 0) {
		return null
	}
	const index = new Document<DocumentationSearchDocument>({
		tokenize: 'full',
		encode: encodeSearchValue,
		document: {
			id: 'path',
			index: ['name', 'content']
		}
	})
	for (const doc of files) {
		index.add({
			path: doc.path,
			name: doc.name,
			content: normalizeSearchContent(doc.content)
		})
	}
	return index
}

export function searchDocs(
	files: DocumentationFile[],
	index: DocumentationSearchIndex,
	query: string,
	limit = SEARCH_RESULTS_MAX_DEFAULT
): SearchResult[] {
	const q = query.trim()
	if (q === '') {
		return []
	}

	const fileById = new Map<string, DocumentationFile>()
	for (const doc of files) {
		fileById.set(doc.path, doc)
	}
	const matches = index.search(q, { limit })
	const ids = new Set<string>()
	if (Array.isArray(matches)) {
		for (const match of matches) {
			if (isDocumentationSearchMatch(match) === false) {
				continue
			}
			for (const id of match.result) {
				if (typeof id === 'string') {
					ids.add(id)
				} else {
					ids.add(String(id))
				}
			}
		}
	}
	const qLower = q.toLowerCase()
	const results: SearchResult[] = []

	type AppendResult = {
		nextIndex: number
		nextOccurrence: number
		added: number
	}

	const appendMatches = (
		doc: DocumentationFile,
		startIndex: number,
		startOccurrence: number,
		maxOccurrences?: number
	): AppendResult => {
		const plain = normalizeSearchContent(doc.content)
		if (plain === '') {
			return {
				nextIndex: startIndex,
				nextOccurrence: startOccurrence,
				added: 0
			}
		}
		const lower = plain.toLowerCase()
		let fromIndex = startIndex
		let occurrence = startOccurrence
		let added = 0
		while (
			results.length < limit &&
			(maxOccurrences === undefined || added < maxOccurrences)
		) {
			const idx = lower.indexOf(qLower, fromIndex)
			if (idx === -1) {
				break
			}
			results.push({
				path: doc.path,
				name: doc.name,
				snippet: buildSnippetAt(doc.content, q, idx),
				occurrence
			})
			occurrence += 1
			added += 1
			fromIndex = idx + q.length
		}
		return {
			nextIndex: fromIndex,
			nextOccurrence: occurrence,
			added
		}
	}

	if (ids.size === 0) {
		return results
	}

	const docsFromIds: DocumentationFile[] = []
	for (const id of ids) {
		const doc = fileById.get(id)
		if (doc !== undefined) {
			docsFromIds.push(doc)
		}
	}

	const matchState = new Map<
		string,
		{ nextIndex: number; nextOccurrence: number }
	>()
	for (const doc of docsFromIds) {
		const result = appendMatches(doc, 0, 0, SEARCH_INITIAL_OCCURRENCES_PER_DOC)
		if (result.added > 0) {
			matchState.set(doc.path, {
				nextIndex: result.nextIndex,
				nextOccurrence: result.nextOccurrence
			})
		}
		if (results.length >= limit) {
			return results
		}
	}

	for (const doc of docsFromIds) {
		const state = matchState.get(doc.path)
		if (state === undefined) {
			continue
		}
		appendMatches(doc, state.nextIndex, state.nextOccurrence)
		if (results.length >= limit) {
			return results
		}
	}

	return results
}

function isDocumentationSearchMatch(
	value: unknown
): value is DocumentationSearchMatch {
	if (hasSearchResult(value) === false) {
		return false
	}
	if (Array.isArray(value.result) === false) {
		return false
	}
	for (const entry of value.result) {
		if (typeof entry !== 'string' && typeof entry !== 'number') {
			return false
		}
	}
	return true
}

function hasSearchResult(value: unknown): value is { result: unknown } {
	return typeof value === 'object' && value !== null && 'result' in value
}

function encodeSearchValue(value: string): string[] {
	const normalized = normalizeSearchContent(value).toLowerCase()
	if (normalized === '') {
		return []
	}
	const tokens = normalized.split(SEARCH_TOKEN_SEPARATOR)
	if (tokens.length === 0) {
		return []
	}
	if (tokens.length === 1 && tokens[0] === '') {
		return []
	}
	return tokens
}
