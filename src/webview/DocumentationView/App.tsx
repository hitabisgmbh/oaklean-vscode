import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './main.css'
import {
	DocumentationFile,
	DocumentationViewCommands,
	DocumentationView_ParentToChild
} from '../../protocols/DocumentationViewProtocol'
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
import { DocsBreadcrumbs } from '../components/documentation/DocsBreadcrumbs'
import { DocsImageOverlay } from '../components/documentation/DocsImageOverlay'
import { DocsSidebar } from '../components/documentation/DocsSidebar'

declare const acquireVsCodeApi: any
const vscode = acquireVsCodeApi()
export function App() {
	const [files, setFiles] = useState<DocumentationFile[]>([])
	const [selectedPath, setSelectedPath] = useState<string>('')
	const [anchor, setAnchor] = useState<string | undefined>()
	const [highlightTerm, setHighlightTerm] = useState('')
	const [resourceBase, setResourceBase] = useState<string>('')
	const [imageWhitelist, setImageWhitelist] = useState<string[]>([])
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
	const [zoomedImage, setZoomedImage] = useState<{ src: string; alt?: string } | null>(null)
	const clearHighlight = useCallback(() => setHighlightTerm(''), [])
	const { query, setQuery, debouncedQuery, results } = useDocumentationSearch(
		files,
		clearHighlight
	)

	const selectedDoc = useMemo(
		() => files.find((doc) => doc.path === selectedPath) ?? files[0],
		[files, selectedPath]
	)

	const folderTree = useMemo(() => buildFolderTree(files), [files])
	const folderDefaultMap = useMemo(() => buildDefaultFileMap(folderTree), [folderTree])

	const html = useMemo(() => {
		if (!selectedDoc) return '<p>No documentation available.</p>'
		const rendered = markdown.render(selectedDoc.content, {
			currentPath: selectedDoc.path,
			resourceBase,
			imageWhitelist
		})
		return rewriteHtmlImages(rendered, {
			currentPath: selectedDoc.path,
			resourceBase,
			imageWhitelist
		})
	}, [selectedDoc, resourceBase, imageWhitelist])

	const breadcrumbs = useMemo(
		() => buildBreadcrumbs(selectedDoc, folderDefaultMap),
		[selectedDoc, folderDefaultMap]
	)

	const handleInit = useCallback((message: DocumentationView_ParentToChild) => {
		if (message.type !== DocumentationViewCommands.init) return
		setFiles(message.files || [])
		setSelectedPath(message.initialFile || message.files[0]?.path || '')
		setAnchor(undefined)
		setResourceBase(message.resourceBase || '')
		setImageWhitelist(message.imageWhitelist || [])
		setHighlightTerm('')
	}, [])

	const handleOpen = useCallback((message: DocumentationView_ParentToChild) => {
		if (message.type !== DocumentationViewCommands.open) return
		setSelectedPath(message.filePath)
		setAnchor(message.anchor)
		setHighlightTerm('')
	}, [])

	useDocumentationMessaging(vscode, handleInit, handleOpen)

	useEffect(() => {
		if (!selectedPath) return
		const segments = selectedPath.split('/').slice(0, -1)
		if (segments.length === 0) return
		setExpandedFolders((prev) => {
			const next = new Set(prev)
			let current = ''
			for (const seg of segments) {
				current = current ? `${current}/${seg}` : seg
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
				setZoomedImage(null)
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
		if (targetPath) {
			setSelectedPath(targetPath)
			setAnchor(undefined)
			setHighlightTerm('')
		}
		setExpandedFolders((prev) => {
			if (prev.has(path)) return prev
			const next = new Set(prev)
			next.add(path)
			return next
		})
	}

	function handleSelectFile(path: string) {
		setSelectedPath(path)
		setAnchor(undefined)
		setHighlightTerm('')
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
		onZoomImage: setZoomedImage
	})

	useSearchHighlight(contentRef, html, highlightTerm, debouncedQuery)
	return (
		<div className="doc-container">
			<DocsSidebar
				query={query}
				results={results}
				folderTree={folderTree}
				selectedPath={selectedPath}
				expandedFolders={expandedFolders}
				isEmpty={files.length === 0}
				onQueryChange={setQuery}
				onResultSelect={(path) => {
					setSelectedPath(path)
					setAnchor(undefined)
					const term = debouncedQuery.trim()
					setHighlightTerm(term)
					setQuery(term)
				}}
				onSelectFile={handleSelectFile}
				onToggleFolder={handleFolderToggle}
				onSelectFolder={handleFolderSelect}
			/>
			<main className="doc-main">
				<DocsBreadcrumbs
					breadcrumbs={breadcrumbs}
					rootTarget={folderDefaultMap.get('')}
					onSelectRoot={() => {
						const rootPath = folderDefaultMap.get('')
						if (rootPath) {
							setSelectedPath(rootPath)
							setAnchor(undefined)
							setHighlightTerm('')
						}
					}}
					onSelectCrumb={(path) => {
						const targetPath = folderDefaultMap.get(path)
						if (targetPath) {
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
				<div className="doc-content" ref={contentRef}>
					{selectedDoc ? (
						<div
							dangerouslySetInnerHTML={{ __html: html }}
						/>
					) : (
						<div className="doc-empty">Select a file to view its content.</div>
					)}
				</div>
			</main>
		</div>
	)
}
