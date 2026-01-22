import { useEffect, useMemo, useRef, useState } from 'react'
import FlexSearch from 'flexsearch'

import { DocumentationFile } from '../../protocols/DocumentationViewProtocol'
import { buildSnippetAt, normalizeSearchContent } from './markdownUtils'

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
			index.add({
				...doc,
				content: normalizeSearchContent(doc.content)
			})
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
		const maxResults = 10
		const qLower = q.toLowerCase()
		const results: { path: string; name: string; snippet: string; occurrence: number }[] = []
		const appendMatches = (doc: DocumentationFile) => {
			const plain = normalizeSearchContent(doc.content)
			if (!plain) return
			const lower = plain.toLowerCase()
			let fromIndex = 0
			let occurrence = 0
			while (results.length < maxResults) {
				const idx = lower.indexOf(qLower, fromIndex)
				if (idx === -1) break
				results.push({
					path: doc.path,
					name: doc.name,
					snippet: buildSnippetAt(doc.content, q, idx),
					occurrence
				})
				occurrence += 1
				fromIndex = idx + q.length
			}
		}

		if (ids.size === 0) {
			for (const doc of files) {
				appendMatches(doc)
				if (results.length >= maxResults) break
			}
			return results
		}

		for (const id of ids) {
			const doc = fileById.get(id as string)
			if (!doc) continue
			appendMatches(doc)
			if (results.length >= maxResults) break
		}
		return results
	}, [files, debouncedQuery])

	return {
		query,
		setQuery,
		debouncedQuery,
		results
	}
}
