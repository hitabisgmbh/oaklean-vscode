import { useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import { createSearchIndex, searchDocs } from './searchUtils'

import { SEARCH_DEBOUNCE_IN_MS } from '../../constants/documentationSearch'
import type { DocumentationFile } from '../../protocols/DocumentationViewProtocol'
import type { SearchResult } from '../../types/documentationView'

type DocumentationSearchState = {
	query: string
	setQuery: Dispatch<SetStateAction<string>>
	debouncedQuery: string
	results: SearchResult[]
}

export function useDocumentationSearch(
	files: DocumentationFile[],
	maxResults: number,
	onDebounce?: () => void
): DocumentationSearchState {
	const [query, setQuery] = useState('')
	const [debouncedQuery, setDebouncedQuery] = useState('')
	const onDebounceRef = useRef(onDebounce)
	const searchStateRef = useRef<{
		index: ReturnType<typeof createSearchIndex>
		filesSnapshot: DocumentationFile[]
	} | null>(null)

	useEffect(() => {
		onDebounceRef.current = onDebounce
	}, [onDebounce])

	const searchState = useMemo(() => {
		if (files === undefined || files.length === 0) {
			searchStateRef.current = null
			return null
		}
		const previous = searchStateRef.current
		if (
			previous !== null &&
			areFilesEquivalent(previous.filesSnapshot, files) === true
		) {
			return previous
		}
		// Build the index alongside a stable snapshot of the files used.
		const nextState = {
			index: createSearchIndex(files),
			filesSnapshot: files
		}
		searchStateRef.current = nextState
		return nextState
	}, [files])

	useEffect(() => {
		if (query.trim() === '') {
			setDebouncedQuery('')
			return
		}
		// Debounce typing to avoid rebuilding results on every keystroke.
		const handle = setTimeout(() => {
			setDebouncedQuery(query)
			onDebounceRef.current?.()
		}, SEARCH_DEBOUNCE_IN_MS)
		return () => clearTimeout(handle)
	}, [query])

	const results = useMemo(() => {
		const q = debouncedQuery.trim()
		if (q === '') {
			return []
		}
		if (searchState === null) {
			return []
		}
		if (searchState.index === null) {
			return []
		}
		// Search the snapshot used to build the index for consistent results.
		return searchDocs(
			searchState.filesSnapshot,
			searchState.index,
			q,
			maxResults
		)
	}, [debouncedQuery, maxResults, searchState])

	return {
		query,
		setQuery,
		debouncedQuery,
		results
	}
}

function areFilesEquivalent(
	previous: DocumentationFile[],
	next: DocumentationFile[]
): boolean {
	if (previous.length !== next.length) {
		return false
	}
	for (let i = 0; i < previous.length; i++) {
		const prevFile = previous[i]
		const nextFile = next[i]
		if (prevFile.path !== nextFile.path) {
			return false
		}
		if (prevFile.name !== nextFile.name) {
			return false
		}
		const prevVersion = prevFile.version
		const nextVersion = nextFile.version
		if (prevVersion === undefined || nextVersion === undefined) {
			return false
		}
		if (prevVersion !== nextVersion) {
			return false
		}
	}
	return true
}
