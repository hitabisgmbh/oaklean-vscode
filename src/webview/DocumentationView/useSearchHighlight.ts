import { useEffect } from 'react'
import type { RefObject } from 'react'

export function useSearchHighlight(
	contentRef: RefObject<HTMLDivElement | null>,
	html: string,
	highlightTerm: string,
	debouncedQuery: string
) {
	useEffect(() => {
		const root = contentRef.current
		if (!root) return

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
	}, [contentRef, html, highlightTerm, debouncedQuery])
}
