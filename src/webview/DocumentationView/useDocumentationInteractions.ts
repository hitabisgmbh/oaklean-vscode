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
	onZoomImage: (image: { src: string; alt?: string } | null) => void
}

export function useDocumentationInteractions({
	files,
	selectedPath,
	anchor,
	html,
	onSelectPath,
	onSetAnchor,
	onOpenExternal,
	onZoomImage
}: InteractionOptions) {
	useEffect(() => {
		function handleLink(href: string) {
			if (!href) return
			if (href.startsWith('#')) {
				onSetAnchor(href.substring(1))
				return
			}
			if (/^https?:\/\//i.test(href) || href.startsWith('mailto:')) {
				onOpenExternal(href)
				return
			}

			const [pathPart, hashPart] = href.split('#')
			let targetPath = selectedPath

			if (pathPart) {
				const normalized = pathPart.replace(/^\.\//, '').toLowerCase()
				const match = files.find((f) =>
					f.name.toLowerCase() === normalized ||
					f.path.toLowerCase().endsWith(normalized)
				)

				if (match) {
					targetPath = match.path
				} else {
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

			onSelectPath(targetPath)
			onSetAnchor(hashPart || undefined)
		}

		function onClick(event: MouseEvent) {
			const target = event.target as HTMLElement
			if (target?.tagName?.toLowerCase() === 'img') {
				const img = target as HTMLImageElement
				if (img.src) {
					onZoomImage({ src: img.src, alt: img.alt })
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
	}, [files, onOpenExternal, onSelectPath, onSetAnchor, onZoomImage, selectedPath])

	useEffect(() => {
		if (!anchor) return
		const element = document.getElementById(anchor)
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' })
		}
	}, [anchor, html])
}
