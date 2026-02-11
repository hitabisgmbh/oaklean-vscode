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
	SearchResult
} from '../../types/documentationView'

export function createSearchIndex(
	files: DocumentationFile[]
): DocumentationSearchIndex | null {
	if (files.length === 0) {
		return null
	}
	// Build a FlexSearch index for doc name + content fields.
	const index = new Document<DocumentationSearchDocument>({
		tokenize: 'full',
		encode: encodeSearchValue,
		document: {
			id: 'path',
			index: ['name', 'content'],
			store: true
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
	index: DocumentationSearchIndex,
	query: string,
	limit = SEARCH_RESULTS_MAX_DEFAULT
): SearchResult[] {
	// Normalize and short-circuit empty queries.
	const q = query.trim()
	if (q === '') {
		return []
	}

	const matches = index.search(q, { limit })
	const ids = new Set<string>()
	for (const match of matches) {
		for (const id of match.result) {
			ids.add(id.toString())
		}
	}

	const qLower = q.toLowerCase()
	const results: SearchResult[] = []

	if (ids.size === 0) {
		return results
	}

	type AppendResult = {
		nextIndex: number
		nextOccurrence: number
		added: number
	}

	// Append search occurrences for a single document with optional cap.
	const appendMatches = (
		doc: DocumentationFile,
		startIndex: number,
		startOccurrence: number,
		maxOccurrences?: number
	): AppendResult => {
		const normalizedLowerContent = doc.content.toLowerCase()
		let fromIndex = startIndex
		let occurrence = startOccurrence
		let added = 0
		while (
			results.length < limit &&
			(maxOccurrences === undefined || added < maxOccurrences)
		) {
			const idx = normalizedLowerContent.indexOf(qLower, fromIndex)
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

	// Preserve search order from the index and resolve to docs.
	const docsFromIds: DocumentationFile[] = []
	for (const id of ids) {
		const doc = index.get(id)
		if (doc !== null) {
			docsFromIds.push(doc)
		}
	}

	const matchState = new Map<
		string,
		{ nextIndex: number; nextOccurrence: number }
	>()
	// First pass: limit occurrences per doc to spread results.
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

	// Second pass: fill remaining slots by continuing occurrences.
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

function encodeSearchValue(value: string): string[] {
	// Normalize and split into tokens for FlexSearch.
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
