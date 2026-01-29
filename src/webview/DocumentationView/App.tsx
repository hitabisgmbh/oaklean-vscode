import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'

import './main.css'
import { markdown, rewriteHtmlImages } from './markdownUtils'
import {
	buildBreadcrumbs,
	buildDefaultFileMap,
	buildFolderTree
} from './treeUtils'
import { useDocumentationSearch } from './useDocumentationSearch'
import { useSearchHighlight } from './useSearchHighlight'
import { useDocumentationInteractions } from './useDocumentationInteractions'
import { useDocumentationMessaging } from './useDocumentationMessaging'

import { DOCUMENTATION_OVERVIEW_LABEL } from '../../constants/documentationView'
import {
	DOCUMENTATION_MISSING_FILE_MESSAGE,
	DOCUMENTATION_NO_CONTENT_MESSAGE,
	DOCUMENTATION_SELECT_FILE_MESSAGE
} from '../../constants/documentationUi'
import {
	SEARCH_RESULTS_MAX_DEFAULT,
	SEARCH_RESULTS_PAGE_SIZE_DEFAULT
} from '../../constants/documentationSearch'
import {
	DocumentationFile,
	DocumentationViewCommands,
	DocumentationView_ParentToChild
} from '../../protocols/DocumentationViewProtocol'
import { DocsBreadcrumbs } from '../components/documentation/DocsBreadcrumbs'
import { DocsImageOverlay } from '../components/documentation/DocsImageOverlay'
import { DocsSidebar } from '../components/documentation/DocsSidebar'

type VsCodeApi = {
	postMessage: (message: unknown) => void
}

declare const acquireVsCodeApi: () => VsCodeApi
const vscode = acquireVsCodeApi()
export function App(): ReactElement {
	const [files, setFiles] = useState<DocumentationFile[]>([])
	const [selectedPath, setSelectedPath] = useState<string>('')
	const [anchor, setAnchor] = useState<string | undefined>()
	const [highlightTerm, setHighlightTerm] = useState('')
	const [highlightOccurrence, setHighlightOccurrence] = useState<number | null>(
		null
	)
	const [highlightBump, setHighlightBump] = useState(0)
	const [resourceBase, setResourceBase] = useState<string>('')
	const [docsBasePath, setDocsBasePath] = useState<string>('')
	const [imageWhitelist, setImageWhitelist] = useState<string[]>([])
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
	const [searchMaxResults, setSearchMaxResults] = useState<number>(
		SEARCH_RESULTS_MAX_DEFAULT
	)
	const [searchPageSize, setSearchPageSize] = useState<number>(
		SEARCH_RESULTS_PAGE_SIZE_DEFAULT
	)
	const [visibleResultsCount, setVisibleResultsCount] = useState<number>(
		SEARCH_RESULTS_PAGE_SIZE_DEFAULT
	)
	const [zoomedImage, setZoomedImage] = useState<{
		src: string
		alt?: string
	} | null>(null)
	const [missingLink, setMissingLink] = useState<string | null>(null)
	const suppressExpandRef = useRef(false)
	const clearHighlight = useCallback(() => {
		setHighlightTerm('')
		setHighlightOccurrence(null)
		setHighlightBump((prev) => prev + 1)
	}, [])
	const { query, setQuery, debouncedQuery, results } = useDocumentationSearch(
		files,
		searchMaxResults,
		clearHighlight
	)

	const selectedDoc = useMemo(
		() => files.find((doc) => doc.path === selectedPath) ?? files[0],
		[files, selectedPath]
	)

	const folderTree = useMemo(() => buildFolderTree(files), [files])
	const folderDefaultMap = useMemo(
		() => buildDefaultFileMap(folderTree),
		[folderTree]
	)
	const overviewPath = useMemo(
		() =>
			files.find(
				(doc) =>
					doc.name.toLowerCase() === 'readme.md' && !doc.path.includes('/')
			)?.path,
		[files]
	)

	const html = useMemo(() => {
		if (selectedDoc === undefined) {
			return `<p>${DOCUMENTATION_NO_CONTENT_MESSAGE}</p>`
		}
		const base = docsBasePath.trim().replace(/\/+$/, '')
		const currentPath =
			base !== '' ? `${base}/${selectedDoc.path}` : selectedDoc.path
		const rendered = markdown.render(selectedDoc.content, {
			currentPath,
			resourceBase,
			imageWhitelist
		})
		return rewriteHtmlImages(rendered, {
			currentPath,
			resourceBase,
			imageWhitelist
		})
	}, [selectedDoc, docsBasePath, resourceBase, imageWhitelist])

	const breadcrumbs = useMemo(() => {
		const crumbs = buildBreadcrumbs(selectedDoc, folderDefaultMap)
		if (
			overviewPath !== undefined &&
			selectedDoc !== undefined &&
			selectedDoc.path === overviewPath &&
			crumbs.length > 0
		) {
			crumbs[crumbs.length - 1] = {
				...crumbs[crumbs.length - 1],
				label: DOCUMENTATION_OVERVIEW_LABEL,
				clickable: false
			}
		}
		return crumbs
	}, [selectedDoc, folderDefaultMap, overviewPath])

	const handleInit = useCallback((message: DocumentationView_ParentToChild) => {
		if (message.type !== DocumentationViewCommands.init) {
			return
		}
		const maxResults = message.searchMaxResults ?? SEARCH_RESULTS_MAX_DEFAULT
		const pageSizeFromMessage =
			message.searchPageSize ?? SEARCH_RESULTS_PAGE_SIZE_DEFAULT
		const pageSize =
			pageSizeFromMessage > maxResults ? maxResults : pageSizeFromMessage
		setFiles(message.files ?? [])
		setSelectedPath(message.initialFile ?? message.files[0]?.path ?? '')
		setAnchor(undefined)
		setResourceBase(message.resourceBase ?? '')
		setDocsBasePath(message.docsBasePath ?? '')
		setImageWhitelist(message.imageWhitelist ?? [])
		setSearchMaxResults(maxResults)
		setSearchPageSize(pageSize)
		setVisibleResultsCount(pageSize)
		setHighlightTerm('')
		setHighlightOccurrence(null)
		setHighlightBump((prev) => prev + 1)
	}, [])

	const handleOpen = useCallback((message: DocumentationView_ParentToChild) => {
		if (message.type !== DocumentationViewCommands.open) {
			return
		}
		setSelectedPath(message.filePath)
		setAnchor(message.anchor)
		setHighlightTerm('')
		setHighlightOccurrence(null)
		setHighlightBump((prev) => prev + 1)
	}, [])

	useDocumentationMessaging(vscode, handleInit, handleOpen)

	// Reset the dropdown to the first page when the query or page size changes.
	useEffect(() => {
		setVisibleResultsCount(searchPageSize)
	}, [debouncedQuery, searchPageSize])

	useEffect(() => {
		if (selectedPath === '') {
			return
		}
		if (suppressExpandRef.current) {
			suppressExpandRef.current = false
			return
		}
		const segments = selectedPath.split('/').slice(0, -1)
		if (segments.length === 0) {
			return
		}
		setExpandedFolders((prev) => {
			const next = new Set(prev)
			let current = ''
			for (const seg of segments) {
				current = current === '' ? seg : `${current}/${seg}`
				next.add(current)
			}
			return next
		})
	}, [selectedPath])

	// Clear highlight when Escape is pressed
	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				setHighlightTerm('')
				setHighlightOccurrence(null)
				setHighlightBump((prev) => prev + 1)
				setZoomedImage(null)
				setMissingLink(null)
			}
		}

		document.addEventListener('keydown', onKeyDown)
		return () => document.removeEventListener('keydown', onKeyDown)
	}, [])

	const contentRef = useRef<HTMLDivElement | null>(null)

	function handleFolderToggle(path: string) {
		setExpandedFolders((prev) => {
			const next = new Set(prev)
			if (next.has(path)) {
				next.delete(path)
			} else {
				next.add(path)
			}
			return next
		})
	}

	function handleFolderSelect(path: string) {
		const targetPath = folderDefaultMap.get(path)
		if (targetPath !== undefined) {
			suppressExpandRef.current = true
			setSelectedPath(targetPath)
			setAnchor(undefined)
			setHighlightTerm('')
			setHighlightOccurrence(null)
			setHighlightBump((prev) => prev + 1)
		}
	}

	function handleSelectFile(path: string) {
		setSelectedPath(path)
		setAnchor(undefined)
		setHighlightTerm('')
		setHighlightOccurrence(null)
		setHighlightBump((prev) => prev + 1)
	}

	// Reveal one more page of results in the dropdown.
	function handleShowMoreResults() {
		setVisibleResultsCount((prev) => {
			const next = prev + searchPageSize
			return next > results.length ? results.length : next
		})
	}

	useDocumentationInteractions({
		files,
		selectedPath,
		anchor,
		html,
		onSelectPath: setSelectedPath,
		onSetAnchor: setAnchor,
		onOpenExternal: (href) =>
			vscode.postMessage({
				type: DocumentationViewCommands.openExternal,
				href
			}),
		onMissingFile: (path) => setMissingLink(path),
		onZoomImage: setZoomedImage
	})

	useSearchHighlight(
		contentRef,
		html,
		highlightTerm,
		debouncedQuery,
		highlightOccurrence,
		highlightBump
	)
	return (
		<div className="doc-container">
			<DocsSidebar
				query={query}
				results={results}
				visibleResultsCount={visibleResultsCount}
				folderTree={folderTree}
				selectedPath={selectedPath}
				expandedFolders={expandedFolders}
				isEmpty={files.length === 0}
				overviewPath={overviewPath}
				onQueryChange={setQuery}
				onResultSelect={(path, occurrence) => {
					setSelectedPath(path)
					setAnchor(undefined)
					const term = debouncedQuery.trim()
					setHighlightTerm(term)
					setHighlightOccurrence(occurrence)
					setHighlightBump((prev) => prev + 1)
					setQuery(term)
				}}
				onSelectFile={handleSelectFile}
				onToggleFolder={handleFolderToggle}
				onSelectFolder={handleFolderSelect}
				onShowMoreResults={handleShowMoreResults}
			/>
			<main className="doc-main">
				<DocsBreadcrumbs
					breadcrumbs={breadcrumbs}
					rootTarget={folderDefaultMap.get('')}
					onSelectRoot={() => {
						const rootPath = folderDefaultMap.get('')
						if (rootPath !== undefined) {
							setSelectedPath(rootPath)
							setAnchor(undefined)
							setHighlightTerm('')
						}
					}}
					onSelectCrumb={(path) => {
						const targetPath = folderDefaultMap.get(path)
						if (targetPath !== undefined) {
							setSelectedPath(targetPath)
							setAnchor(undefined)
							setHighlightTerm('')
						}
					}}
				/>
				<DocsImageOverlay
					image={zoomedImage}
					onClose={() => setZoomedImage(null)}
				/>
				{missingLink !== null && (
					<div
						className="doc-missing-overlay"
						role="alertdialog"
						aria-live="assertive"
						onClick={() => setMissingLink(null)}
					>
						<div
							className="doc-missing-card"
							onClick={(event) => event.stopPropagation()}
						>
							<div className="doc-missing-icon" aria-hidden="true">
								X
							</div>
							<div className="doc-missing-text">
								{DOCUMENTATION_MISSING_FILE_MESSAGE}
							</div>
						</div>
					</div>
				)}
				<div className="doc-content" ref={contentRef}>
					{selectedDoc !== undefined ? (
						<div dangerouslySetInnerHTML={{ __html: html }} />
					) : (
						<div className="doc-empty">{DOCUMENTATION_SELECT_FILE_MESSAGE}</div>
					)}
				</div>
			</main>
		</div>
	)
}
