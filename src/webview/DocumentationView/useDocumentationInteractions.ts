import { useEffect, useMemo } from 'react'

import type { DocumentationEntry } from '../../types/documentation'

type InteractionOptions = {
	files: DocumentationEntry[]
	selectedPath: string
	anchor?: string
	html: string
	onSelectPath: (path: string) => void
	onSetAnchor: (anchor?: string) => void
	onOpenExternal: (href: string) => void
	onMissingFile: (path: string) => void
	onZoomImage: (image: { src: string; alt?: string } | null) => void
}

type LinkResolution =
	| { type: 'anchor'; anchor: string }
	| { type: 'external'; href: string }
	| {
			type: 'doc' | 'other'
			targetPath: string
			anchor?: string
			missingPath?: string
	  }

// Resolves a clicked href into a doc path, anchor, or external target.
export function resolveDocumentationLink(
	href: string,
	selectedPath: string,
	filePathMap: Map<string, string>
): LinkResolution {
	if (href === '') {
		return { type: 'other', targetPath: selectedPath }
	}
	if (href.startsWith('#')) {
		return { type: 'anchor', anchor: href.substring(1) }
	}
	if (/^https?:\/\//i.test(href) || href.startsWith('mailto:')) {
		return { type: 'external', href }
	}

	const [pathPart, hashPart] = href.split('#')
	let targetPath = selectedPath
	let missingPath: string | undefined
	const pathWithoutQuery = pathPart.split('?')[0]
	const isDocLink =
		pathWithoutQuery !== '' && /\.(md|markdown)$/i.test(pathWithoutQuery)

	if (pathWithoutQuery !== '') {
		const isAbsolute = pathWithoutQuery.startsWith('/')
		const normalized = pathWithoutQuery.replace(/^\//, '').replace(/^\.\//, '')
		const baseSegments = isAbsolute ? [] : selectedPath.split('/').slice(0, -1)
		const targetSegments = normalized
			.split('/')
			.filter((segment) => segment !== '')
		const resolvedSegments: string[] = []
		// Resolve "." and ".." segments against the selected path.
		for (const seg of targetSegments) {
			if (seg === '..') {
				baseSegments.pop()
			} else if (seg !== '.') {
				resolvedSegments.push(seg)
			}
		}
		const candidate = [...baseSegments, ...resolvedSegments].join('/')
		const candidateLower = candidate.toLowerCase()
		const resolvedPath = filePathMap.get(candidateLower)
		if (resolvedPath !== undefined) {
			targetPath = resolvedPath
		} else {
			missingPath = candidate === '' ? normalized : candidate
		}
	}

	return {
		type: isDocLink ? 'doc' : 'other',
		targetPath,
		anchor: hashPart === undefined || hashPart === '' ? undefined : hashPart,
		missingPath
	}
}

// Binds click handling and anchor scrolling for rendered documentation.
export function useDocumentationInteractions({
	files,
	selectedPath,
	anchor,
	html,
	onSelectPath,
	onSetAnchor,
	onOpenExternal,
	onMissingFile,
	onZoomImage
}: InteractionOptions): void {
	const filePathMap = useMemo(() => {
		const map = new Map<string, string>()
		for (const file of files) {
			map.set(file.path.toLowerCase(), file.path)
		}
		return map
	}, [files])

	useEffect(() => {
		// Handle link/image clicks inside the rendered HTML content.
		function handleLink(href: string) {
			const resolved = resolveDocumentationLink(href, selectedPath, filePathMap)
			if (resolved.type === 'anchor') {
				onSetAnchor(resolved.anchor)
				return
			}
			if (resolved.type === 'external') {
				onOpenExternal(resolved.href)
				return
			}
			if (resolved.type === 'doc' && resolved.missingPath) {
				onMissingFile(resolved.missingPath)
				return
			}
			onSelectPath(resolved.targetPath)
			onSetAnchor(resolved.anchor)
		}

		function onClick(event: MouseEvent) {
			const target = event.target
			const anchorElement =
				target instanceof Element ? target.closest('a') : null
			if (anchorElement !== null) {
				const href = anchorElement.getAttribute('href')
				if (href === null || href === '') {
					return
				}
				event.preventDefault()
				handleLink(href)
				return
			}
			if (target instanceof HTMLImageElement) {
				if (target.src !== '') {
					onZoomImage({ src: target.src, alt: target.alt })
				}
			}
		}

		document.addEventListener('click', onClick)
		return () => document.removeEventListener('click', onClick)
	}, [
		onMissingFile,
		onOpenExternal,
		onSelectPath,
		onSetAnchor,
		onZoomImage,
		filePathMap,
		selectedPath
	])

	useEffect(() => {
		if (anchor === undefined) {
			return
		}
		const element = document.getElementById(anchor)
		// Scroll to the anchor after content renders.
		if (element !== null) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}
	}, [anchor, html])
}
