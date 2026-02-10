import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

const SEARCH_HIT_SELECTOR = '.search-hit'
const SEARCH_HIT_CLASS_NAME = 'search-hit'
const SEARCH_HIT_TERM_ATTRIBUTE = 'data-term'
const SEARCH_HIT_OCCURRENCE_ATTRIBUTE = 'data-occurrence'
const DOC_MAIN_SELECTOR = '.doc-main'
const IMAGE_SELECTOR = 'img'
const SCROLL_BEHAVIOR_SMOOTH = 'smooth'
const HIGHLIGHT_DEFAULT_OCCURRENCE = 0
const NO_MATCH_INDEX = -1
const NO_MATCHES_FOUND = 0

type SearchHighlightCache = {
	html: string
	term: string
	matchOffsets: number[]
}

// Input: content container + search params. Output: highlights and scrolls to match.
export function useSearchHighlight(
	contentRef: RefObject<HTMLDivElement | null>,
	html: string,
	highlightTerm: string,
	highlightOccurrence: number | null,
	highlightBump: number
): void {
	const matchCacheRef = useRef<SearchHighlightCache | null>(null)

	useEffect(() => {
		const root = contentRef.current
		if (root === null) {
			return
		}

		// Skip work if there is no term to highlight.
		const term = highlightTerm.trim()
		const targetOccurrence = highlightOccurrence ?? HIGHLIGHT_DEFAULT_OCCURRENCE
		if (term === '') {
			clearHighlightSpans(root)
			return
		}

		if (hasTargetHighlight(root, term, targetOccurrence) === true) {
			return setupHitScroll(root)
		}

		// Clear any previous highlight spans before creating the new one.
		clearHighlightSpans(root)

		const lowerTerm = term.toLowerCase()
		const matchOffsets = getOrCreateMatchOffsets(
			matchCacheRef,
			root,
			html,
			lowerTerm,
			term.length
		)
		if (targetOccurrence < HIGHLIGHT_DEFAULT_OCCURRENCE) {
			return
		}
		if (targetOccurrence >= matchOffsets.length) {
			return
		}
		const targetOffset = matchOffsets[targetOccurrence]

		const wrapped = wrapTargetMatch(root, targetOffset, term, targetOccurrence)
		if (wrapped === false) {
			return
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

function getOrCreateMatchOffsets(
	cacheRef: RefObject<SearchHighlightCache | null>,
	root: HTMLDivElement,
	html: string,
	term: string,
	termLength: number
): number[] {
	const cache = cacheRef.current
	if (cache !== null && cache.html === html && cache.term === term) {
		return cache.matchOffsets
	}
	const matchOffsets = collectMatchOffsets(root, term, termLength)
	cacheRef.current = { html, term, matchOffsets }
	return matchOffsets
}

function collectMatchOffsets(
	root: HTMLDivElement,
	term: string,
	termLength: number
): number[] {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
	const matchOffsets: number[] = []
	let globalOffset = 0
	let node: Node | null = walker.nextNode()

	while (node !== null) {
		const text = node.textContent ?? ''
		const lowerText = text.toLowerCase()
		let searchFrom = HIGHLIGHT_DEFAULT_OCCURRENCE
		let idx = lowerText.indexOf(term, searchFrom)
		while (idx !== NO_MATCH_INDEX) {
			matchOffsets.push(globalOffset + idx)
			searchFrom = idx + termLength
			idx = lowerText.indexOf(term, searchFrom)
		}
		globalOffset += text.length
		node = walker.nextNode()
	}

	return matchOffsets
}

function wrapTargetMatch(
	root: HTMLDivElement,
	targetOffset: number,
	term: string,
	targetOccurrence: number
): boolean {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
	let globalOffset = 0
	let node: Node | null = walker.nextNode()

	while (node !== null) {
		const text = node.textContent ?? ''
		const nodeStart = globalOffset
		const nodeEnd = nodeStart + text.length
		if (targetOffset >= nodeStart && targetOffset < nodeEnd) {
			if (node.parentNode === null) {
				return false
			}
			const localStart = targetOffset - nodeStart
			const localEnd = localStart + term.length
			const before = text.slice(HIGHLIGHT_DEFAULT_OCCURRENCE, localStart)
			const match = text.slice(localStart, localEnd)
			const after = text.slice(localEnd)

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
			return true
		}
		globalOffset = nodeEnd
		node = walker.nextNode()
	}

	return false
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
	if (images.length === NO_MATCHES_FOUND) {
		return () => cancelAnimationFrame(animationFrameId)
	}
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
