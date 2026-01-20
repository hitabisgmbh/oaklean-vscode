import { useEffect, useMemo, useRef, useState } from 'react'
import FlexSearch from 'flexsearch'

import { DocumentationFile } from '../../protocols/DocumentationViewProtocol'
import { buildSnippet } from './markdownUtils'

export function useDocumentationSearch(
	files: DocumentationFile[],
	onDebounce?: () => void
) {
	const [query, setQuery] = useState('')
	const [debouncedQuery, setDebouncedQuery] = useState('')
	const searchIndexRef = useRef<any>(null)

	useEffect(() => {
		if (!files.length) {
			searchIndexRef.current = null
			return
		}
		const index = new (FlexSearch as any).Document({
			document: {
				id: 'path',
				index: ['name', 'content']
			}
		})
		files.forEach((doc) => {
			index.add(doc)
		})
		searchIndexRef.current = index
	}, [files])

	useEffect(() => {
		const handle = setTimeout(() => {
			setDebouncedQuery(query)
			onDebounce?.()
		}, 150)
		return () => clearTimeout(handle)
	}, [query, onDebounce])

	const results = useMemo(() => {
		const q = debouncedQuery.trim()
		if (!q) return []
		const index = searchIndexRef.current
		if (!index) return []

		const fileById = new Map(files.map((doc) => [doc.path, doc]))
		const matches = index.search(q, { limit: 10 }) || []
		const ids = new Set(matches.flatMap((match: any) => match.result || []))
		return Array.from(ids)
			.map((id) => fileById.get(id as string))
			.filter((doc): doc is DocumentationFile => Boolean(doc))
			.map((doc) => ({
				path: doc.path,
				name: doc.name,
				snippet: buildSnippet(doc.content, q)
			}))
	}, [files, debouncedQuery])

	return {
		query,
		setQuery,
		debouncedQuery,
		results
	}
}
