import { useEffect } from 'react'

import { DocumentationFile } from '../../protocols/DocumentationViewProtocol'

type InteractionOptions = {
	files: DocumentationFile[]
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

export function resolveDocumentationLink(
	href: string,
	selectedPath: string,
	files: DocumentationFile[]
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
	const isDocLink = pathPart !== '' && /\.md|\.markdown/i.test(pathPart)

	if (pathPart !== '') {
		const isAbsolute = pathPart.startsWith('/')
		const normalized = pathPart.replace(/^\//, '').replace(/^\.\//, '')
		const baseSegments = isAbsolute ? [] : selectedPath.split('/').slice(0, -1)
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
		const relMatch = files.find(
			(file) => file.path.toLowerCase() === candidate.toLowerCase()
		)
		if (relMatch !== undefined) {
			targetPath = relMatch.path
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
	useEffect(() => {
		function handleLink(href: string) {
			const resolved = resolveDocumentationLink(href, selectedPath, files)
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
			if (target instanceof HTMLImageElement) {
				if (target.src !== '') {
					onZoomImage({ src: target.src, alt: target.alt })
				}
				return
			}
			if (target instanceof HTMLAnchorElement === false) {
				return
			}
			const href = target.getAttribute('href')
			if (href === null || href === '') {
				return
			}
			event.preventDefault()
			handleLink(href)
		}

		document.addEventListener('click', onClick)
		return () => document.removeEventListener('click', onClick)
	}, [
		files,
		onMissingFile,
		onOpenExternal,
		onSelectPath,
		onSetAnchor,
		onZoomImage,
		selectedPath
	])

	useEffect(() => {
		if (anchor === undefined) {
			return
		}
		const element = document.getElementById(anchor)
		if (element !== null) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}
	}, [anchor, html])
}
