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

// Add slugified ids to headings for anchor support
const slugify = (str: string) =>
	str
		.toLowerCase()
		.replace(/[^\w]+/g, '-')
		.replace(/^-+|-+$/g, '')

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

	const selectedDoc = useMemo(
		() => files.find((doc) => doc.path === selectedPath) ?? files[0],
		[files, selectedPath]
	)

	const html = useMemo(() => {
		if (!selectedDoc) return '<p>No documentation available.</p>'
		return md.render(selectedDoc.content)
	}, [selectedDoc])

	useEffect(() => {
		function handleMessages(event: MessageEvent<DocumentationView_ParentToChild>) {
			const message = event.data
			switch (message?.command) {
				case DocumentationViewCommands.init:
					setFiles(message.files || [])
					setSelectedPath(message.initialFile || message.files[0]?.path || '')
					setAnchor(undefined)
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

	useEffect(() => {
		const el = contentRef.current
		if (!el) return

		function onClick(event: MouseEvent) {
			const target = event.target as HTMLElement
			if (!target) return
			if (target.tagName.toLowerCase() !== 'a') return
			const anchorEl = target as HTMLAnchorElement
			const href = anchorEl.getAttribute('href')
			if (!href || href.startsWith('http')) return

			event.preventDefault()

			const [pathPart, hashPart] = href.split('#')
			let nextPath = selectedPath
			if (pathPart) {
				const match = files.find((f) =>
					f.name.toLowerCase() === pathPart.toLowerCase() ||
					f.path.toLowerCase().endsWith(pathPart.toLowerCase())
				)
				if (match) {
					nextPath = match.path
				}
			}
			setSelectedPath(nextPath)
			setAnchor(hashPart || undefined)
		}

		el.addEventListener('click', onClick)
		return () => el.removeEventListener('click', onClick)
	}, [files, selectedPath])

	useEffect(() => {
		if (!anchor) return
		const element = document.getElementById(anchor)
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}
	}, [anchor, html])

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
