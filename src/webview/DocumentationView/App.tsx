import { useEffect, useMemo, useRef, useState } from 'react'
import FlexSearch from 'flexsearch'
import MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token'
import type Renderer from 'markdown-it/lib/renderer'
import type { Options as MarkdownOptions } from 'markdown-it'
import './main.css'

import {
	DocumentationFile,
	DocumentationViewCommands,
	DocumentationView_ParentToChild
} from '../../protocols/DocumentationViewProtocol'

declare const acquireVsCodeApi: any
const vscode = acquireVsCodeApi()

const md = new MarkdownIt({
	html: true,
	linkify: true,
	typographer: true
})
const originalImage = md.renderer.rules.image
md.renderer.rules.image = (
	tokens: Token[],
	idx: number,
	options: MarkdownOptions,
	env: any,
	self: Renderer
) => {
	const token = tokens[idx]
	const src = token.attrGet('src') || ''
	if (!src) {
		return ''
	}
	if (src.startsWith('data:')) {
		return originalImage
			? originalImage(tokens, idx, options, env, self)
			: self.renderToken(tokens, idx, options)
	}
	if (isExternalHttpUrl(src)) {
		const whitelist = (env?.imageWhitelist as string[]) || []
		if (!isWhitelistedUrl(src, whitelist)) {
			return ''
		}
		return originalImage
			? originalImage(tokens, idx, options, env, self)
			: self.renderToken(tokens, idx, options)
	}
	if (env?.resourceBase && env?.currentPath) {
		const resolved = resolveResource(env.resourceBase, env.currentPath, src)
		token.attrSet('src', resolved)
	}
	return originalImage
		? originalImage(tokens, idx, options, env, self)
		: self.renderToken(tokens, idx, options)
}

// Add slugified ids to headings for anchor support
const slugify = (str: string) =>
	str
		.toLowerCase()
		.replace(/[^\w]+/g, '-')
		.replace(/^-+|-+$/g, '')

// Build a snippet of text around the first occurrence of the query
function buildSnippet(content: string, query: string) {
	// Strip markdown to get plain text
	const plain = stripMarkdown(content)
	
	const words = plain.replace(/\s+/g, ' ').trim().split(' ')
	const q = query.toLowerCase()
	const matchIndex = words.findIndex((word) => word.toLowerCase().includes(q))
	if (matchIndex === -1) {
		return words.slice(0, 20).join(' ')
	}

	const beforeCount = 8
	const afterCount = 8
	const start = Math.max(0, matchIndex - beforeCount)
	const end = Math.min(words.length, matchIndex + afterCount + 1)
	const snippetWords = words.slice(start, end)
	const relativeIndex = matchIndex - start
	const word = snippetWords[relativeIndex]
	snippetWords[relativeIndex] = word.replace(new RegExp(q, 'i'), (match) => `<strong>${match}</strong>`)
	return snippetWords.join(' ')
}

function stripMarkdown(text: string) {
	return text
		// images: ![alt](url) -> alt
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
		// links: [text](url) -> text
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		// inline code
		.replace(/`([^`]+)`/g, '$1')
		// emphasis/bold markers
		.replace(/[*_~]+/g, '')
		// headings/blockquotes
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/^>\s+/gm, '')
		// list markers
		.replace(/^[\s>*+-]\s+/gm, '')
}

function isExternalHttpUrl(src: string) {
	return /^https?:\/\//i.test(src)
}

function isWhitelistedUrl(src: string, whitelist: string[]) {
	for (const entry of whitelist) {
		const trimmed = entry.trim()
		if (!trimmed) continue
		const lower = trimmed.toLowerCase()
		if (lower.startsWith('http(s)://')) {
			const rest = trimmed.slice('http(s)://'.length)
			if (src.startsWith(`http://${rest}`) || src.startsWith(`https://${rest}`)) {
				return true
			}
		}
		if (/^https?:\/\//i.test(trimmed) && !trimmed.includes('*') && trimmed.includes('/')) {
			if (src.startsWith(trimmed)) {
				return true
			}
		}
		let url: URL
		try {
			url = new URL(src)
		} catch {
			continue
		}
		const schemes = lower.startsWith('http(s)://')
			? ['http:', 'https:']
			: lower.startsWith('https://')
				? ['https:']
				: lower.startsWith('http://')
					? ['http:']
					: ['http:', 'https:']
		if (!schemes.includes(url.protocol)) continue
		let hostPattern = trimmed
			.replace(/^http\(s\):\/\//i, '')
			.replace(/^https?:\/\//i, '')
			.split('/')[0]
		hostPattern = hostPattern.replace(/^\*\./, '').replace(/^\*/, '')
		if (!hostPattern) continue
		const host = url.hostname.toLowerCase()
		const pattern = hostPattern.toLowerCase()
		if (host === pattern || host.endsWith(`.${pattern}`)) {
			return true
		}
	}
	return false
}

function rewriteHtmlImages(
	html: string,
	options: { currentPath: string; resourceBase: string; imageWhitelist: string[] }
) {
	const parser = new DOMParser()
	const doc = parser.parseFromString(html, 'text/html')
	const images = Array.from(doc.querySelectorAll('img'))

	for (const img of images) {
		const src = img.getAttribute('src') || ''
		if (!src) {
			img.remove()
			continue
		}
		if (src.startsWith('data:')) {
			continue
		}
		if (/^vscode-webview-resource:|^vscode-resource:|^vscode-webview:/i.test(src)) {
			continue
		}
		if (isExternalHttpUrl(src)) {
			if (!isWhitelistedUrl(src, options.imageWhitelist)) {
				img.remove()
			}
			continue
		}
		if (options.resourceBase && options.currentPath) {
			img.setAttribute('src', resolveResource(options.resourceBase, options.currentPath, src))
		}
	}

	return doc.body.innerHTML
}

function resolveResource(base: string, docPath: string, relativeSrc: string) {
	// strip leading ./
	const cleaned = relativeSrc.replace(/^\.\//, '')
	// absolute-ish within docs
	const docSegments = docPath.split('/').slice(0, -1)
	const srcSegments = cleaned.split('/').filter(Boolean)
	const stack = [...docSegments]
	for (const seg of srcSegments) {
		if (seg === '..') {
			stack.pop()
		} else if (seg !== '.') {
			stack.push(seg)
		}
	}
	const finalPath = stack.join('/')
	// base already points to docs root
	const suffix = finalPath.replace(/^docs\//i, '')
	return `${base}/${suffix}`
}

const originalHeadingOpen = md.renderer.rules.heading_open
md.renderer.rules.heading_open = (
	tokens: Token[],
	idx: number,
	options: MarkdownOptions,
	env: unknown,
	self: Renderer
) => {
	const titleToken = tokens[idx + 1]
	const title = titleToken?.children?.reduce((acc: string, t: Token) => acc + (t.content || ''), '') || ''
	const slug = slugify(title)
	tokens[idx].attrSet('id', slug)
	return originalHeadingOpen
		? originalHeadingOpen(tokens, idx, options, env, self)
		: self.renderToken(tokens, idx, options)
}

type FolderNode = {
	name: string
	path: string
	folders: FolderNode[]
	files: DocumentationFile[]
	indexFile?: DocumentationFile
}

function getIndexFileRank(fileName: string) {
	const lower = fileName.toLowerCase()
	if (lower === 'readme.md') return 2
	if (lower === 'index.md') return 1
	return 0
}

function buildFolderTree(files: DocumentationFile[]) {
	const root: FolderNode = { name: '', path: '', folders: [], files: [] }
	const byPath = new Map<string, FolderNode>([['', root]])

	for (const file of files) {
		const parts = file.path.split('/').filter(Boolean)
		const fileName = parts.pop()
		let currentPath = ''
		let node = root

		for (const part of parts) {
			currentPath = currentPath ? `${currentPath}/${part}` : part
			let child = byPath.get(currentPath)
			if (!child) {
				child = { name: part, path: currentPath, folders: [], files: [] }
				byPath.set(currentPath, child)
				node.folders.push(child)
			}
			node = child
		}

		if (fileName) {
			const rank = getIndexFileRank(fileName)
			if (rank > 0) {
				const currentRank = node.indexFile ? getIndexFileRank(node.indexFile.name) : 0
				if (rank > currentRank) {
					node.indexFile = file
				}
				continue
			}
		}
		{
			node.files.push(file)
		}
	}

	const sortNode = (node: FolderNode) => {
		node.folders.sort((a, b) => a.name.localeCompare(b.name))
		node.files.sort((a, b) => a.name.localeCompare(b.name))
		node.folders.forEach(sortNode)
	}
	sortNode(root)

	return root
}

function getFolderFiles(node: FolderNode) {
	if (node.indexFile && node.indexFile.name.toLowerCase() !== 'readme.md') {
		return [node.indexFile, ...node.files]
	}
	return node.files
}

function buildDefaultFileMap(node: FolderNode) {
	const map = new Map<string, string>()
	const walk = (folder: FolderNode) => {
		if (folder.indexFile) {
			map.set(folder.path, folder.indexFile.path)
		} else if (folder.files.length > 0) {
			map.set(folder.path, folder.files[0].path)
		}
		folder.folders.forEach(walk)
	}
	walk(node)
	return map
}

function stripExtension(name: string) {
	return name.replace(/\.md$/i, '')
}

export function App() {
	const [files, setFiles] = useState<DocumentationFile[]>([])
	const [selectedPath, setSelectedPath] = useState<string>('')
	const [anchor, setAnchor] = useState<string | undefined>()
	const [query, setQuery] = useState('')
	const [debouncedQuery, setDebouncedQuery] = useState('')
	const [highlightTerm, setHighlightTerm] = useState('')
	const [resourceBase, setResourceBase] = useState<string>('')
	const [imageWhitelist, setImageWhitelist] = useState<string[]>([])
	const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
	const [zoomedImage, setZoomedImage] = useState<{ src: string; alt?: string } | null>(null)
	const searchIndexRef = useRef<any>(null)

	const selectedDoc = useMemo(
		() => files.find((doc) => doc.path === selectedPath) ?? files[0],
		[files, selectedPath]
	)

	const folderTree = useMemo(() => buildFolderTree(files), [files])
	const folderDefaultMap = useMemo(() => buildDefaultFileMap(folderTree), [folderTree])

	const html = useMemo(() => {
		if (!selectedDoc) return '<p>No documentation available.</p>'
		const rendered = md.render(selectedDoc.content, {
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

	const breadcrumbs = useMemo(() => {
		if (!selectedDoc) return []
		const parts = selectedDoc.path.split('/').filter(Boolean)
		const lastPart = parts[parts.length - 1]?.toLowerCase()
		const isIndex =
			lastPart === 'index.md' ||
			(lastPart === 'readme.md' && parts.length > 1)
		const crumbs: { label: string; path: string; clickable: boolean }[] = []
		let current = ''
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i]
			if (i === parts.length - 1 && isIndex) {
				break
			}
			current = current ? `${current}/${part}` : part
			const isFile = i === parts.length - 1 && !isIndex
			const clickable = !isFile && folderDefaultMap.has(current)
			crumbs.push({
				label: stripExtension(part),
				path: current,
				clickable
			})
		}
		return crumbs
	}, [selectedDoc, folderDefaultMap])

	useEffect(() => {
		function handleMessages(event: MessageEvent<DocumentationView_ParentToChild>) {
			const message = event.data
			switch (message?.type) {
				case DocumentationViewCommands.init:
					setFiles(message.files || [])
					setSelectedPath(message.initialFile || message.files[0]?.path || '')
					setAnchor(undefined)
					setResourceBase(message.resourceBase || '')
					setImageWhitelist(message.imageWhitelist || [])
					setHighlightTerm('')
					// Build search index when files are received
					{
						const index = new (FlexSearch as any).Document({
							document: {
								id: 'path',
								index: ['name', 'content']
							}
						})
						;(message.files || []).forEach((doc: DocumentationFile) => {
							index.add(doc)
						})
						searchIndexRef.current = index
					}
					break
				case DocumentationViewCommands.open:
					setSelectedPath(message.filePath)
					setAnchor(message.anchor)
					setHighlightTerm('')
					break
			}
		}

		window.addEventListener('message', handleMessages)
		vscode.postMessage({ type: DocumentationViewCommands.requestDocs })

		return () => window.removeEventListener('message', handleMessages)
	}, [])

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

	// Debounce typing so we search only after the user pauses.
	useEffect(() => {
		const handle = setTimeout(() => {
			setDebouncedQuery(query)
			setHighlightTerm('')
		}, 150)
		return () => clearTimeout(handle)
	}, [query])

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

	const results = useMemo(() => {
		// Use the debounced query to avoid searching on every keystroke.
		const q = debouncedQuery.trim()
		if (!q) return []
		const index = searchIndexRef.current
		if (!index) return []

		// Map file paths to DocumentationFile for easy lookup.
		const fileById = new Map(files.map((doc) => [doc.path, doc]))
		
		// Query the in-memory FlexSearch index and map hits to files.
		// limit to top 10 results so that the dropdown isn't too long.
		const matches = index.search(q, { limit: 10 }) || []
		
		// Collect unique file IDs from all fields
		const ids = new Set(matches.flatMap((match: any) => match.result || []))
		
		// Map IDs back to files
		return Array.from(ids)
			.map((id) => fileById.get(id as string))
			.filter((doc): doc is DocumentationFile => Boolean(doc))
			.map((doc) => ({
				path: doc.path,
				name: doc.name,
				snippet: buildSnippet(doc.content, q)
			}))
	}, [files, debouncedQuery])

	const contentRef = useRef<HTMLDivElement>(null)
	const indentSize = 12

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

	function renderFileButton(doc: DocumentationFile, depth: number) {
		return (
			<button
				key={doc.path}
				type="button"
				className={`doc-file-button${doc.path === selectedPath ? ' doc-file-button-active' : ''}`}
				style={{ paddingLeft: 16 + depth * indentSize }}
				onClick={() => {
					setSelectedPath(doc.path)
					setAnchor(undefined)
					setHighlightTerm('')
				}}
			>
				{doc.name}
			</button>
		)
	}

	function renderFolderNode(folder: FolderNode, depth: number) {
		const isExpanded = expandedFolders.has(folder.path)
		const folderFiles = getFolderFiles(folder)
		const hasChildren = folder.folders.length > 0 || folderFiles.length > 0

		return (
			<div key={folder.path} className="doc-tree-node">
				<div className="doc-tree-row" style={{ paddingLeft: depth * indentSize }}>
					{hasChildren ? (
						<button
							className="doc-tree-toggle"
							type="button"
							onClick={() => handleFolderToggle(folder.path)}
							aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
						>
							{isExpanded ? '▾' : '▸'}
						</button>
					) : (
						<span className="doc-tree-toggle-placeholder" />
					)}
					<button
						type="button"
						className="doc-folder-button"
						onClick={() => handleFolderSelect(folder.path)}
					>
						{folder.name}
					</button>
				</div>
				{isExpanded && (
					<div className="doc-tree-children">
						{folderFiles.map((doc) => renderFileButton(doc, depth + 1))}
						{folder.folders.map((child) => renderFolderNode(child, depth + 1))}
					</div>
				)}
			</div>
		)
	}

	function handleLink(href: string) {
		if (!href) return

		// Fragment-only link (#section) -> same file, scroll to anchor
		if (href.startsWith('#')) {
			setAnchor(href.substring(1))
			return
		}

		// External links -> ask extension to open externally
		if (/^https?:\/\//i.test(href) || href.startsWith('mailto:')) {
			vscode.postMessage({
				type: DocumentationViewCommands.openExternal,
				href
			})
			return
		}

		// Resolve relative markdown link
		const [pathPart, hashPart] = href.split('#')
		let targetPath = selectedPath

		if (pathPart) {
			// normalize by stripping leading './'
			const normalized = pathPart.replace(/^\.\//, '').toLowerCase()

			// try match by exact filename or path suffix
			const match = files.find((f) =>
				f.name.toLowerCase() === normalized ||
				f.path.toLowerCase().endsWith(normalized)
			)

			if (match) {
				targetPath = match.path
			} else {
				// Try resolving relative to current path
				const baseSegments = selectedPath.split('/').slice(0, -1)
				const targetSegments = normalized.split('/').filter(Boolean)
				const resolvedSegments: string[] = []
				for (const seg of targetSegments) {
					if (seg === '..') {
						baseSegments.pop()
					} else if (seg !== '.') {
						resolvedSegments.push(seg)
					}
				}
				const candidate = [...baseSegments, ...resolvedSegments].join('/')
				const relMatch = files.find((f) => f.path.toLowerCase().endsWith(candidate.toLowerCase()))
				if (relMatch) {
					targetPath = relMatch.path
				}
			}
		}

		setSelectedPath(targetPath)
		setAnchor(hashPart || undefined)
	}

	useEffect(() => {
		function onClick(event: MouseEvent) {
			const target = event.target as HTMLElement
			if (target?.tagName?.toLowerCase() === 'img') {
				const img = target as HTMLImageElement
				if (img.src) {
					setZoomedImage({ src: img.src, alt: img.alt })
				}
				return
			}
			if (!target || target.tagName.toLowerCase() !== 'a') return
			const anchorEl = target as HTMLAnchorElement
			const href = anchorEl.getAttribute('href')
			if (!href) return
			event.preventDefault()
			handleLink(href)
		}

		document.addEventListener('click', onClick)
		return () => document.removeEventListener('click', onClick)
	}, [files, selectedPath])

	useEffect(() => {
		if (!anchor) return
		const element = document.getElementById(anchor)
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}
	}, [anchor, html])

	useEffect(() => {
		const root = contentRef.current
		if (!root) return

		// clear previous highlights
		root.querySelectorAll('.search-hit').forEach((hit) => {
			const parent = hit.parentNode
			if (!parent) return
			parent.replaceChild(document.createTextNode(hit.textContent || ''), hit)
			parent.normalize()
		})

		const term = highlightTerm.trim()
		if (!term) return

		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
		let node: Node | null = walker.nextNode()
		const lowerTerm = term.toLowerCase()
		let wrapped = false

		while (node && !wrapped) {
			const text = node.textContent || ''
			const idx = text.toLowerCase().indexOf(lowerTerm)
			if (idx !== -1 && node.parentNode) {
				const before = text.slice(0, idx)
				const match = text.slice(idx, idx + term.length)
				const after = text.slice(idx + term.length)

				const span = document.createElement('span')
				span.className = 'search-hit'
				span.textContent = match
				span.setAttribute('data-pos', String(idx))

				const frag = document.createDocumentFragment()
				if (before) frag.appendChild(document.createTextNode(before))
				frag.appendChild(span)
				if (after) frag.appendChild(document.createTextNode(after))

				node.parentNode.replaceChild(frag, node)
				wrapped = true
			} else {
				node = walker.nextNode()
			}
		}

		const firstHit = root.querySelector('.search-hit')
		if (firstHit) {
			firstHit.scrollIntoView({ behavior: 'smooth', block: 'center' })
		}
	}, [html, highlightTerm, debouncedQuery])

	return (
		<div className="doc-container">
			<aside className="doc-sidebar">
				<input
					className="doc-search"
					type="text"
					placeholder="Search documentation"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
				/>
				{query && (
					<div className="doc-search-dropdown">
						{results.map((res: { path: string; name: string; snippet: string }) => (
							<button
								key={res.path}
								className="doc-result-button"
								onClick={() => {
									setSelectedPath(res.path)
									setAnchor(undefined)
									const term = debouncedQuery.trim()
									setHighlightTerm(term)
									setQuery(term)
								}}
							>
								<div className="doc-result-title">{res.name}</div>
								<div
									className="doc-result-snippet"
									dangerouslySetInnerHTML={{ __html: res.snippet }}
								/>
							</button>
						))}
						{results.length === 0 && (
							<div className="doc-empty">No matches</div>
						)}
					</div>
				)}
				<div className="doc-file-list">
					{folderTree.folders.map((folder) => renderFolderNode(folder, 0))}
					{getFolderFiles(folderTree).map((doc) => renderFileButton(doc, 0))}
					{files.length === 0 && (
						<div className="doc-empty">No matches</div>
					)}
				</div>
			</aside>
			<main className="doc-main">
				{breadcrumbs.length > 0 && (
					<div className="doc-breadcrumbs">
						{folderDefaultMap.get('') ? (
							<button
								type="button"
								className="doc-breadcrumb doc-breadcrumb-link doc-breadcrumb-root"
								onClick={() => {
									const rootPath = folderDefaultMap.get('')
									if (rootPath) {
										setSelectedPath(rootPath)
										setAnchor(undefined)
										setHighlightTerm('')
									}
								}}
							>
								Docs
							</button>
						) : (
							<span className="doc-breadcrumb doc-breadcrumb-root">Docs</span>
						)}
						{breadcrumbs.map((crumb) => (
							<div key={crumb.path} className="doc-breadcrumb-group">
								<span className="doc-breadcrumb-sep">/</span>
								{crumb.clickable ? (
									<button
										type="button"
										className="doc-breadcrumb doc-breadcrumb-link"
										onClick={() => {
											const targetPath = folderDefaultMap.get(crumb.path)
											if (targetPath) {
												setSelectedPath(targetPath)
												setAnchor(undefined)
												setHighlightTerm('')
											}
										}}
									>
										{crumb.label}
									</button>
								) : (
									<span className="doc-breadcrumb">{crumb.label}</span>
								)}
							</div>
						))}
					</div>
				)}
				{zoomedImage && (
					<div
						className="doc-image-overlay"
						role="dialog"
						aria-modal="true"
						onClick={() => setZoomedImage(null)}
					>
						<img
							src={zoomedImage.src}
							alt={zoomedImage.alt || 'Documentation image'}
							className="doc-image-zoom"
							onClick={(event) => event.stopPropagation()}
						/>
					</div>
				)}
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
