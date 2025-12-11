import { useEffect, useMemo, useRef, useState } from 'react'
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
	html: false,
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
	if (env?.resourceBase && env?.currentPath && src && !/^https?:\/\//i.test(src) && !src.startsWith('mailto:') && !src.startsWith('data:')) {
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

export function App() {
	const [files, setFiles] = useState<DocumentationFile[]>([])
	const [selectedPath, setSelectedPath] = useState<string>('')
	const [anchor, setAnchor] = useState<string | undefined>()
	const [query, setQuery] = useState('')
	const [highlightTerm, setHighlightTerm] = useState('')
	const [resourceBase, setResourceBase] = useState<string>('')

	const selectedDoc = useMemo(
		() => files.find((doc) => doc.path === selectedPath) ?? files[0],
		[files, selectedPath]
	)

	const html = useMemo(() => {
		if (!selectedDoc) return '<p>No documentation available.</p>'
		return md.render(selectedDoc.content, {
			currentPath: selectedDoc.path,
			resourceBase
		})
	}, [selectedDoc, resourceBase])

	useEffect(() => {
		function handleMessages(event: MessageEvent<DocumentationView_ParentToChild>) {
			const message = event.data
			switch (message?.command) {
				case DocumentationViewCommands.init:
					setFiles(message.files || [])
					setSelectedPath(message.initialFile || message.files[0]?.path || '')
					setAnchor(undefined)
					setResourceBase(message.resourceBase || '')
					break
				case DocumentationViewCommands.open:
					setSelectedPath(message.filePath)
					setAnchor(message.anchor)
					break
			}
		}

		window.addEventListener('message', handleMessages)
		vscode.postMessage({ command: DocumentationViewCommands.requestDocs })

		return () => window.removeEventListener('message', handleMessages)
	}, [])

	const results = useMemo(() => {
		const q = query.trim().toLowerCase()
		if (!q) return []
		return files.flatMap((doc) => {
			const idx = doc.content.toLowerCase().indexOf(q)
			if (idx === -1) return []
			const start = Math.max(0, idx - 40)
			const end = Math.min(doc.content.length, idx + q.length + 40)
			const snippet = doc.content.substring(start, end).replace(/\s+/g, ' ')
			return [{
				path: doc.path,
				name: doc.name,
				snippet
			}]
		})
	}, [files, query])

	const contentRef = useRef<HTMLDivElement>(null)

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
				command: DocumentationViewCommands.openExternal,
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
	}, [html, highlightTerm])

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
						{results.map((res) => (
							<button
								key={res.path}
								className="doc-result-button"
								onClick={() => {
									setSelectedPath(res.path)
									setAnchor(undefined)
									setHighlightTerm(query.trim())
									setQuery('')
								}}
							>
								<div className="doc-result-title">{res.name}</div>
								<div className="doc-result-snippet">{res.snippet}</div>
							</button>
						))}
						{results.length === 0 && (
							<div className="doc-empty">No matches</div>
						)}
					</div>
				)}
				<div className="doc-file-list">
					{files.map((doc) => (
						<button
							key={doc.path}
							className={`doc-file-button${doc.path === selectedPath ? ' doc-file-button-active' : ''}`}
							onClick={() => setSelectedPath(doc.path)}
						>
							{doc.name}
						</button>
					))}
					{files.length === 0 && (
						<div className="doc-empty">No matches</div>
					)}
				</div>
			</aside>
			<main className="doc-main">
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
