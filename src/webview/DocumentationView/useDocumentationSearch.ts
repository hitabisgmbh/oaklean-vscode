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

// Input: docs array + max results + optional debounce callback. Output: search state.
export function useDocumentationSearch(
	files: DocumentationFile[] | undefined,
	maxResults: number,
	onDebounce?: () => void
): DocumentationSearchState {
	const [query, setQuery] = useState('')
	const [debouncedQuery, setDebouncedQuery] = useState('')
	const [staticFiles, setStaticFiles] = useState<DocumentationFile[] | null>(
		null
	)
	const onDebounceRef = useRef(onDebounce)

	useEffect(() => {
		onDebounceRef.current = onDebounce
	}, [onDebounce])

	// Capture docs once. The docs list is static during the webview lifetime.
	useEffect(() => {
		if (staticFiles !== null) {
			return
		}
		if (files === undefined || files.length === 0) {
			return
		}
		setStaticFiles(files)
	}, [files, staticFiles])

	// Build the search index once from the captured docs.
	const searchIndex = useMemo(() => {
		if (staticFiles === null) {
			return null
		}
		return createSearchIndex(staticFiles)
	}, [staticFiles])

	// Debounce user input before searching.
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

	// Compute search results from the cached index snapshot.
	const results = useMemo(() => {
		const q = debouncedQuery.trim()
		if (q === '') {
			return []
		}
		if (staticFiles === null) {
			return []
		}
		if (searchIndex === null) {
			return []
		}
		return searchDocs(staticFiles, searchIndex, q, maxResults)
	}, [debouncedQuery, maxResults, searchIndex, staticFiles])

	return {
		query,
		setQuery,
		debouncedQuery,
		results
	}
}
