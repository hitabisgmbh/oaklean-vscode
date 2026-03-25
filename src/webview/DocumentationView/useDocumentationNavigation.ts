import { useCallback, useEffect } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'

import { DOCUMENTATION_PATH_SEPARATOR } from '../../constants/documentationTree'

type DocumentationNavigationParams = {
	selectedPath: string
	folderDefaultMap: Map<string, string>
	searchPageSize: number
	resultsLength: number
	debouncedQuery: string
	setQuery: Dispatch<SetStateAction<string>>
	setSelectedPath: Dispatch<SetStateAction<string>>
	setAnchor: Dispatch<SetStateAction<string | undefined>>
	setHighlightTerm: Dispatch<SetStateAction<string>>
	setHighlightOccurrence: Dispatch<SetStateAction<number | null>>
	setHighlightBump: Dispatch<SetStateAction<number>>
	setVisibleResultsCount: Dispatch<SetStateAction<number>>
	setExpandedFolders: Dispatch<SetStateAction<Set<string>>>
	suppressExpandRef: MutableRefObject<boolean>
}

type DocumentationNavigationActions = {
	handleFolderToggle: (path: string) => void
	handleFolderSelect: (path: string) => void
	handleSelectFile: (path: string) => void
	handleShowMoreResults: () => void
	handleResultSelect: (path: string, occurrence: number) => void
	handleSelectRoot: () => void
	handleSelectCrumb: (path: string) => void
}

export function useDocumentationNavigation({
	selectedPath,
	folderDefaultMap,
	searchPageSize,
	resultsLength,
	debouncedQuery,
	setQuery,
	setSelectedPath,
	setAnchor,
	setHighlightTerm,
	setHighlightOccurrence,
	setHighlightBump,
	setVisibleResultsCount,
	setExpandedFolders,
	suppressExpandRef
}: DocumentationNavigationParams): DocumentationNavigationActions {
	useEffect(() => {
		setVisibleResultsCount(searchPageSize)
	}, [debouncedQuery, searchPageSize, setVisibleResultsCount])

	useEffect(() => {
		if (selectedPath === '') {
			return
		}
		if (suppressExpandRef.current) {
			suppressExpandRef.current = false
			return
		}
		const segments = selectedPath
			.split(DOCUMENTATION_PATH_SEPARATOR)
			.slice(0, -1)
		if (segments.length === 0) {
			return
		}
		setExpandedFolders((prev) => {
			const next = new Set(prev)
			let current = ''
			for (const seg of segments) {
				current =
					current === ''
						? seg
						: `${current}${DOCUMENTATION_PATH_SEPARATOR}${seg}`
				next.add(current)
			}
			return next
		})
	}, [selectedPath, setExpandedFolders, suppressExpandRef])

	const resetHighlight = useCallback(() => {
		setHighlightTerm('')
		setHighlightOccurrence(null)
		setHighlightBump((prev) => prev + 1)
	}, [setHighlightTerm, setHighlightOccurrence, setHighlightBump])

	const handleFolderToggle = useCallback(
		(path: string) => {
			setExpandedFolders((prev) => {
				const next = new Set(prev)
				if (next.has(path)) {
					next.delete(path)
				} else {
					next.add(path)
				}
				return next
			})
		},
		[setExpandedFolders]
	)

	const handleFolderSelect = useCallback(
		(path: string) => {
			const targetPath = folderDefaultMap.get(path)
			if (targetPath !== undefined) {
				suppressExpandRef.current = true
				setSelectedPath(targetPath)
				setAnchor(undefined)
				resetHighlight()
			}
		},
		[
			folderDefaultMap,
			resetHighlight,
			setAnchor,
			setSelectedPath,
			suppressExpandRef
		]
	)

	const handleSelectFile = useCallback(
		(path: string) => {
			setSelectedPath(path)
			setAnchor(undefined)
			resetHighlight()
		},
		[resetHighlight, setAnchor, setSelectedPath]
	)

	const handleShowMoreResults = useCallback(() => {
		setVisibleResultsCount((prev) => {
			const next = prev + searchPageSize
			return next > resultsLength ? resultsLength : next
		})
	}, [resultsLength, searchPageSize, setVisibleResultsCount])

	const handleResultSelect = useCallback(
		(path: string, occurrence: number) => {
			setSelectedPath(path)
			setAnchor(undefined)
			const term = debouncedQuery.trim()
			setHighlightTerm(term)
			setHighlightOccurrence(occurrence)
			setHighlightBump((prev) => prev + 1)
			setQuery(term)
		},
		[
			debouncedQuery,
			setAnchor,
			setHighlightBump,
			setHighlightOccurrence,
			setHighlightTerm,
			setQuery,
			setSelectedPath
		]
	)

	const handleSelectRoot = useCallback(() => {
		const rootPath = folderDefaultMap.get('')
		if (rootPath !== undefined) {
			setSelectedPath(rootPath)
			setAnchor(undefined)
			setHighlightTerm('')
		}
	}, [folderDefaultMap, setAnchor, setHighlightTerm, setSelectedPath])

	const handleSelectCrumb = useCallback(
		(path: string) => {
			const targetPath = folderDefaultMap.get(path)
			if (targetPath !== undefined) {
				setSelectedPath(targetPath)
				setAnchor(undefined)
				setHighlightTerm('')
			}
		},
		[folderDefaultMap, setAnchor, setHighlightTerm, setSelectedPath]
	)

	return {
		handleFolderToggle,
		handleFolderSelect,
		handleSelectFile,
		handleShowMoreResults,
		handleResultSelect,
		handleSelectRoot,
		handleSelectCrumb
	}
}
