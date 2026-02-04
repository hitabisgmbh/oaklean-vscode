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
import { useDocumentationNavigation } from './useDocumentationNavigation'

import {
	DOCUMENTATION_KEY_ESCAPE,
	DOCUMENTATION_OVERVIEW_LABEL,
	DOCUMENTATION_NO_CONTENT_MESSAGE
} from '../../constants/documentationUi'
import {
	SEARCH_RESULTS_MAX_DEFAULT,
	SEARCH_RESULTS_PAGE_SIZE_DEFAULT
} from '../../constants/documentationSearch'
import {
	DOCUMENTATION_PATH_SEPARATOR,
	DOCUMENTATION_README_FILE_NAME
} from '../../constants/documentationTree'
import {
	DocumentationFile,
	DocumentationViewCommands,
	DocumentationView_ParentToChild
} from '../../protocols/DocumentationViewProtocol'
import { DocsMainContent } from '../components/documentation/DocsMainContent'
import { DocsSidebar } from '../components/documentation/DocsSidebar'

type VsCodeApi = {
	postMessage: (message: unknown) => void
}

declare const acquireVsCodeApi: () => VsCodeApi
const vscode = acquireVsCodeApi()
// Input: none. Output: Docs view UI tree.
export function App(): ReactElement {
	// Documents and selection state.
	const [files, setFiles] = useState<DocumentationFile[]>([])
	const [selectedPath, setSelectedPath] = useState<string>('')
	const [anchor, setAnchor] = useState<string | undefined>()
	// In-page highlight state for search jumps.
	const [highlightTerm, setHighlightTerm] = useState('')
	const [highlightOccurrence, setHighlightOccurrence] = useState<number | null>(
		null
	)
	const [highlightBump, setHighlightBump] = useState(0)
	// Base paths for resolving images in the webview.
	const [resourceBase, setResourceBase] = useState<string>('')
	const [docsBasePath, setDocsBasePath] = useState<string>('')
	const [imageWhitelist, setImageWhitelist] = useState<string[]>([])
	// Sidebar tree expansion state.
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
	// Search config and pagination.
	const [searchMaxResults, setSearchMaxResults] = useState<number>(
		SEARCH_RESULTS_MAX_DEFAULT
	)
	const [searchPageSize, setSearchPageSize] = useState<number>(
		SEARCH_RESULTS_PAGE_SIZE_DEFAULT
	)
	const [visibleResultsCount, setVisibleResultsCount] = useState<number>(
		SEARCH_RESULTS_PAGE_SIZE_DEFAULT
	)
	// Image zoom and missing link overlays.
	const [zoomedImage, setZoomedImage] = useState<{
		src: string
		alt?: string
	} | null>(null)
	const [missingLink, setMissingLink] = useState<string | null>(null)
	const suppressExpandRef = useRef(false)
	// Clear highlight state when a new search starts.
	const clearHighlight = useCallback(() => {
		setHighlightTerm('')
		setHighlightOccurrence(null)
		setHighlightBump((prev) => prev + 1)
	}, [])
	// Search state from the index + debounce hook.
	const { query, setQuery, debouncedQuery, results } = useDocumentationSearch(
		files,
		searchMaxResults,
		clearHighlight
	)

	// Selected document derived from the current path.
	const selectedDoc = useMemo(
		() => files.find((doc) => doc.path === selectedPath) ?? files[0],
		[files, selectedPath]
	)

	// Build tree + breadcrumb data from docs.
	const folderTree = useMemo(() => buildFolderTree(files), [files])
	const folderDefaultMap = useMemo(
		() => buildDefaultFileMap(folderTree),
		[folderTree]
	)
	const overviewPath = useMemo(
		() =>
			files.find(
				(doc) =>
					doc.name.toLowerCase() === DOCUMENTATION_README_FILE_NAME &&
					doc.path.includes(DOCUMENTATION_PATH_SEPARATOR) === false
			)?.path,
		[files]
	)

	const html = useMemo(() => {
		if (selectedDoc === undefined) {
			return `<p>${DOCUMENTATION_NO_CONTENT_MESSAGE}</p>`
		}
		// Render markdown and rewrite relative image sources for the webview.
		const base = docsBasePath.trim().replace(/\/+$/, '')
		const currentPath =
			base !== ''
				? `${base}${DOCUMENTATION_PATH_SEPARATOR}${selectedDoc.path}`
				: selectedDoc.path
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

	// Build breadcrumbs and override label for the overview entry.
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

	// Initialize webview state from the extension host payload.
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

	// Open a specific document from the extension host.
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

	// Subscribe to init/open messages from the extension host.
	useDocumentationMessaging(vscode, handleInit, handleOpen)

	// Clear highlight when Escape is pressed
	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === DOCUMENTATION_KEY_ESCAPE) {
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

	const handleOpenExternal = useCallback((href: string) => {
		vscode.postMessage({
			type: DocumentationViewCommands.openExternal,
			href
		})
	}, [])

	const handleMissingFile = useCallback((path: string) => {
		setMissingLink(path)
	}, [])

	const contentRef = useRef<HTMLDivElement | null>(null)

	const {
		handleFolderToggle,
		handleFolderSelect,
		handleSelectFile,
		handleShowMoreResults,
		handleResultSelect,
		handleSelectRoot,
		handleSelectCrumb
	} = useDocumentationNavigation({
		selectedPath,
		folderDefaultMap,
		searchPageSize,
		resultsLength: results.length,
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
	})

	// Handle internal links, anchors, and image clicks in rendered HTML.
	useDocumentationInteractions({
		files,
		selectedPath,
		anchor,
		html,
		onSelectPath: setSelectedPath,
		onSetAnchor: setAnchor,
		onOpenExternal: handleOpenExternal,
		onMissingFile: handleMissingFile,
		onZoomImage: setZoomedImage
	})

	useSearchHighlight(
		contentRef,
		html,
		highlightTerm,
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
				onResultSelect={handleResultSelect}
				onSelectFile={handleSelectFile}
				onToggleFolder={handleFolderToggle}
				onSelectFolder={handleFolderSelect}
				onShowMoreResults={handleShowMoreResults}
			/>
			<DocsMainContent
				breadcrumbs={breadcrumbs}
				rootTarget={folderDefaultMap.get('')}
				zoomedImage={zoomedImage}
				missingLink={missingLink}
				selectedDoc={selectedDoc}
				html={html}
				contentRef={contentRef}
				onCloseZoomImage={() => setZoomedImage(null)}
				onCloseMissingLink={() => setMissingLink(null)}
				onSelectRoot={handleSelectRoot}
				onSelectCrumb={handleSelectCrumb}
			/>
		</div>
	)
}
