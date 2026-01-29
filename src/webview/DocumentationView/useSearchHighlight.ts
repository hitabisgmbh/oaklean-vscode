import { useEffect } from 'react'
import type { RefObject } from 'react'

export function useSearchHighlight(
	contentRef: RefObject<HTMLDivElement | null>,
	html: string,
	highlightTerm: string,
	debouncedQuery: string,
	highlightOccurrence: number | null,
	highlightBump: number
): void {
	useEffect(() => {
		const root = contentRef.current
		if (root === null) {
			return
		}

		const hits = root.querySelectorAll('.search-hit')
		for (const hit of Array.from(hits)) {
			const parent = hit.parentNode
			if (parent === null) {
				continue
			}
			parent.replaceChild(document.createTextNode(hit.textContent ?? ''), hit)
			parent.normalize()
		}

		const term = highlightTerm.trim()
		if (term === '') {
			return
		}

		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
		let node: Node | null = walker.nextNode()
		const lowerTerm = term.toLowerCase()
		let wrapped = false
		let occurrenceIndex = 0
		const targetOccurrence = highlightOccurrence ?? 0

		while (node && !wrapped) {
			const text = node.textContent ?? ''
			const lowerText = text.toLowerCase()
			let searchFrom = 0
			let idx = lowerText.indexOf(lowerTerm, searchFrom)
			while (idx !== -1 && !wrapped) {
				if (occurrenceIndex === targetOccurrence && node.parentNode !== null) {
					const before = text.slice(0, idx)
					const match = text.slice(idx, idx + term.length)
					const after = text.slice(idx + term.length)

					const span = document.createElement('span')
					span.className = 'search-hit'
					span.textContent = match
					span.setAttribute('data-pos', String(idx))

					const frag = document.createDocumentFragment()
					if (before !== '') {
						frag.appendChild(document.createTextNode(before))
					}
					frag.appendChild(span)
					if (after !== '') {
						frag.appendChild(document.createTextNode(after))
					}

					node.parentNode.replaceChild(frag, node)
					wrapped = true
					break
				}
				occurrenceIndex += 1
				searchFrom = idx + term.length
				idx = lowerText.indexOf(lowerTerm, searchFrom)
			}

			if (wrapped === false) {
				node = walker.nextNode()
			}
		}

		const scrollToHit = () => {
			const firstHit = root.querySelector('.search-hit')
			if (firstHit === null) {
				return
			}
			if (firstHit instanceof HTMLElement === false) {
				return
			}
			const closestContainer = root.closest('.doc-main')
			const scrollContainer =
				closestContainer instanceof HTMLElement ? closestContainer : root
			const hitRect = firstHit.getBoundingClientRect()
			const containerRect = scrollContainer.getBoundingClientRect()
			const targetTop =
				hitRect.top - containerRect.top + scrollContainer.scrollTop
			const target =
				targetTop - scrollContainer.clientHeight / 2 + hitRect.height / 2
			scrollContainer.scrollTo({
				top: Math.max(0, target),
				behavior: 'smooth'
			})
		}

		requestAnimationFrame(scrollToHit)
		const images = Array.from(root.querySelectorAll('img'))
		const onImageLoad = () => scrollToHit()
		for (const img of images) {
			if (img.complete === true) {
				continue
			}
			img.addEventListener('load', onImageLoad, { once: true })
			img.addEventListener('error', onImageLoad, { once: true })
		}

		return () => {
			for (const img of images) {
				img.removeEventListener('load', onImageLoad)
				img.removeEventListener('error', onImageLoad)
			}
		}
	}, [
		contentRef,
		html,
		highlightTerm,
		debouncedQuery,
		highlightOccurrence,
		highlightBump
	])
}
