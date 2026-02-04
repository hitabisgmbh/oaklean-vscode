import { useEffect } from 'react'
import type { RefObject } from 'react'

const SEARCH_HIT_SELECTOR = '.search-hit'
const SEARCH_HIT_CLASS_NAME = 'search-hit'
const SEARCH_HIT_TERM_ATTRIBUTE = 'data-term'
const SEARCH_HIT_OCCURRENCE_ATTRIBUTE = 'data-occurrence'
const DOC_MAIN_SELECTOR = '.doc-main'
const IMAGE_SELECTOR = 'img'
const SCROLL_BEHAVIOR_SMOOTH = 'smooth'

// Input: content container + search params. Output: highlights and scrolls to match.
export function useSearchHighlight(
	contentRef: RefObject<HTMLDivElement | null>,
	html: string,
	highlightTerm: string,
	highlightOccurrence: number | null,
	highlightBump: number
): void {
	useEffect(() => {
		const root = contentRef.current
		if (root === null) {
			return
		}

		// Skip work if there is no term to highlight.
		const term = highlightTerm.trim()
		const targetOccurrence = highlightOccurrence ?? 0
		if (term === '') {
			clearHighlightSpans(root)
			return
		}

		if (hasTargetHighlight(root, term, targetOccurrence) === true) {
			return setupHitScroll(root)
		}

		// Clear any previous highlight spans before creating the new one.
		clearHighlightSpans(root)

		// Walk text nodes to find the target occurrence.
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
		let node: Node | null = walker.nextNode()
		const lowerTerm = term.toLowerCase()
		let wrapped = false
		let occurrenceIndex = 0

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
					span.className = SEARCH_HIT_CLASS_NAME
					span.textContent = match
					span.setAttribute(SEARCH_HIT_TERM_ATTRIBUTE, term)
					span.setAttribute(
						SEARCH_HIT_OCCURRENCE_ATTRIBUTE,
						String(targetOccurrence)
					)

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

		return setupHitScroll(root)
	}, [contentRef, html, highlightTerm, highlightOccurrence, highlightBump])
}

function clearHighlightSpans(root: HTMLDivElement): void {
	const hits = root.querySelectorAll(SEARCH_HIT_SELECTOR)
	for (const hit of Array.from(hits)) {
		const parent = hit.parentNode
		if (parent === null) {
			continue
		}
		parent.replaceChild(document.createTextNode(hit.textContent ?? ''), hit)
		parent.normalize()
	}
}

function hasTargetHighlight(
	root: HTMLDivElement,
	term: string,
	targetOccurrence: number
): boolean {
	const firstHit = root.querySelector(SEARCH_HIT_SELECTOR)
	if (firstHit instanceof HTMLElement === false) {
		return false
	}
	const hitTerm = firstHit.getAttribute(SEARCH_HIT_TERM_ATTRIBUTE)
	if (hitTerm !== term) {
		return false
	}
	const occurrenceValue = firstHit.getAttribute(SEARCH_HIT_OCCURRENCE_ATTRIBUTE)
	if (occurrenceValue === null) {
		return false
	}
	const occurrence = Number(occurrenceValue)
	if (Number.isNaN(occurrence)) {
		return false
	}
	return occurrence === targetOccurrence
}

function setupHitScroll(root: HTMLDivElement): () => void {
	function scrollToHit() {
		const firstHit = root.querySelector(SEARCH_HIT_SELECTOR)
		if (firstHit === null) {
			return
		}
		if (firstHit instanceof HTMLElement === false) {
			return
		}
		const closestContainer = root.closest(DOC_MAIN_SELECTOR)
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
			behavior: SCROLL_BEHAVIOR_SMOOTH
		})
	}

	// Defer scroll until after layout is updated.
	const animationFrameId = requestAnimationFrame(scrollToHit)
	// Re-run scroll after images load to avoid layout shifts.
	const images = Array.from(root.querySelectorAll(IMAGE_SELECTOR))
	function onImageLoad() {
		scrollToHit()
	}
	for (const img of images) {
		if (img.complete === true) {
			continue
		}
		img.addEventListener('load', onImageLoad, { once: true })
		img.addEventListener('error', onImageLoad, { once: true })
	}

	// Cleanup image listeners on re-run/unmount.
	return () => {
		cancelAnimationFrame(animationFrameId)
		for (const img of images) {
			img.removeEventListener('load', onImageLoad)
			img.removeEventListener('error', onImageLoad)
		}
	}
}
