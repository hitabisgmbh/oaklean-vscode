import MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token'
import type Renderer from 'markdown-it/lib/renderer'
import type { Options as MarkdownOptions } from 'markdown-it'

import {
	SEARCH_SNIPPET_DEFAULT_WORDS,
	SEARCH_SNIPPET_WORDS_AFTER,
	SEARCH_SNIPPET_WORDS_BEFORE
} from '../../constants/documentationSearch'
import { DOCUMENTATION_PATH_SEPARATOR } from '../../constants/documentationTree'
import {
	DOCUMENTATION_ALLOWED_IMAGE_GITHUB_PATH_PREFIX,
	DOCUMENTATION_ALLOWED_IMAGE_HOST_GITHUB,
	DOCUMENTATION_ALLOWED_IMAGE_HOST_OAKLEAN,
	DOCUMENTATION_ALLOWED_IMAGE_PROTOCOLS
} from '../../constants/documentationSecurity'

// Input: heading text. Output: URL-safe slug.
function slugify(str: string): string {
	return str
		.toLowerCase()
		.replace(/[^\w]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

// Shared Markdown renderer with heading IDs.
export const markdown = createMarkdownRenderer()

// Input: none. Output: configured MarkdownIt instance.
function createMarkdownRenderer() {
	const md = new MarkdownIt({
		html: true,
		linkify: true,
		typographer: false
	})

	const originalHeadingOpen = md.renderer.rules.heading_open
	md.renderer.rules.heading_open = (
		tokens: Token[],
		idx: number,
		options: MarkdownOptions,
		env: unknown,
		self: Renderer
	) => {
		const titleToken = tokens[idx + 1]
		const title =
			titleToken?.children?.reduce(
				(acc: string, t: Token) => acc + (t.content ?? ''),
				''
			) ?? ''
		const slug = slugify(title)
		tokens[idx].attrSet('id', slug)
		return originalHeadingOpen
			? originalHeadingOpen(tokens, idx, options, env, self)
			: self.renderToken(tokens, idx, options)
	}

	return md
}

// Input: markdown content + query. Output: short snippet with highlighted term.
export function buildSnippet(content: string, query: string): string {
	const plain = normalizeSearchContent(content)
	const words = plain.split(' ').filter((word) => word !== '')
	const q = query.toLowerCase()
	const matchIndex = words.findIndex((word) => word.toLowerCase().includes(q))
	if (matchIndex === -1) {
		return words.slice(0, SEARCH_SNIPPET_DEFAULT_WORDS).join(' ')
	}

	return buildSnippetAt(content, query, findWordStartIndex(words, matchIndex))
}

// Input: content + query + match index. Output: snippet with highlighted term.
export function buildSnippetAt(
	content: string,
	query: string,
	matchIndex: number
): string {
	const plain = normalizeSearchContent(content)
	if (plain === '') {
		return ''
	}
	const words = plain.split(' ').filter((word) => word !== '')
	let wordIndex = 0
	let cursor = 0
	for (let i = 0; i < words.length; i++) {
		const start = cursor
		const end = start + words[i].length
		if (matchIndex >= start && matchIndex < end) {
			wordIndex = i
			break
		}
		cursor = end + 1
	}

	const start = Math.max(0, wordIndex - SEARCH_SNIPPET_WORDS_BEFORE)
	const end = Math.min(words.length, wordIndex + SEARCH_SNIPPET_WORDS_AFTER + 1)
	const snippetWords = words.slice(start, end)
	const snippet = snippetWords.join(' ')
	const pattern = new RegExp(escapeRegExp(query), 'i')
	return snippet.replace(
		pattern,
		(match) => `<mark class="doc-search-match">${match}</mark>`
	)
}

// Input: HTML + options. Output: HTML with image sources rewritten/filtered.
export function rewriteHtmlImages(
	html: string,
	options: {
		currentPath: string
		resourceBase: string
	}
): string {
	const parser = new DOMParser()
	const doc = parser.parseFromString(html, 'text/html')
	const images = Array.from(doc.querySelectorAll('img'))

	for (const img of images) {
		const src = img.getAttribute('src') ?? ''
		if (src === '') {
			img.remove()
			continue
		}
		if (src.startsWith('data:')) {
			continue
		}
		if (
			/^vscode-webview-resource:|^vscode-resource:|^vscode-webview:/i.test(src)
		) {
			continue
		}
		if (isExternalHttpUrl(src)) {
			if (isWhitelistedUrl(src) === false) {
				img.remove()
			}
			continue
		}
		if (options.resourceBase !== '' && options.currentPath !== '') {
			img.setAttribute(
				'src',
				resolveResource(options.resourceBase, options.currentPath, src)
			)
		}
	}

	return doc.body.innerHTML
}

// Input: HTML + options. Output: HTML with doc links disabled when missing.
export function rewriteHtmlLinks(
	html: string,
	options: { currentPath: string; docPaths: Set<string> }
): string {
	const parser = new DOMParser()
	const doc = parser.parseFromString(html, 'text/html')
	const anchors = Array.from(doc.querySelectorAll('a'))

	for (const anchor of anchors) {
		const href = anchor.getAttribute('href') ?? ''
		if (href === '') {
			continue
		}
		if (href.startsWith('#')) {
			continue
		}
		if (isExternalHttpUrl(href) || href.startsWith('mailto:')) {
			continue
		}
		if (
			/^vscode-webview-resource:|^vscode-resource:|^vscode-webview:/i.test(href)
		) {
			continue
		}
		const [pathPart] = href.split('#')
		if (pathPart === '') {
			continue
		}
		const lowerPath = pathPart.toLowerCase()
		if (!lowerPath.endsWith('.md') && !lowerPath.endsWith('.markdown')) {
			continue
		}
		const resolved = resolveDocPath(options.currentPath, pathPart)
		if (options.docPaths.has(resolved) === false) {
			anchor.removeAttribute('href')
			anchor.classList.add('doc-link-disabled')
		}
	}

	return doc.body.innerHTML
}

// Input: webview base + doc path + relative src. Output: absolute resource path.
export function resolveResource(
	base: string,
	docPath: string,
	relativeSrc: string
): string {
	return resolvePath(base, docPath, relativeSrc)
}

// Input: doc path + relative path. Output: resolved doc path.
export function resolveDocPath(docPath: string, relativePath: string): string {
	return resolvePath('', docPath, relativePath)
}

// Input: markdown text. Output: plain text without markup.
export function stripMarkdown(text: string): string {
	return text
		.replace(/<[^>]*>/g, '')
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/[*_~]+/g, '')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/^>\s+/gm, '')
		.replace(/^[\s>*+-]\s+/gm, '')
}

// Input: markdown text. Output: normalized searchable content.
export function normalizeSearchContent(text: string): string {
	let cleaned = stripMarkdown(text)
	cleaned = cleaned.replace(/^\s*\|?[\s:-]+(\|[\s:-]+)+\|?\s*$/gm, ' ')
	cleaned = cleaned.replace(/\|/g, ' ')
	return cleaned.replace(/\s+/g, ' ').trim()
}

// Input: raw string. Output: escaped string for RegExp.
function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Input: words array + index. Output: character offset for that word.
function findWordStartIndex(words: string[], wordIndex: number): number {
	let index = 0
	for (let i = 0; i < wordIndex; i++) {
		index += words[i].length + 1
	}
	return index
}

// Input: URL string. Output: true if http/https.
function isExternalHttpUrl(src: string): boolean {
	return /^https?:\/\//i.test(src)
}

// Input: URL string. Output: true if allowed.
function isWhitelistedUrl(src: string): boolean {
	let url: URL
	try {
		url = new URL(src)
	} catch {
		return false
	}

	if (isAllowedImageProtocol(url.protocol) === false) {
		return false
	}

	const hostname = url.hostname.toLowerCase()
	if (hostname === DOCUMENTATION_ALLOWED_IMAGE_HOST_OAKLEAN) {
		return true
	}
	if (hostname !== DOCUMENTATION_ALLOWED_IMAGE_HOST_GITHUB) {
		return false
	}
	if (url.pathname === DOCUMENTATION_ALLOWED_IMAGE_GITHUB_PATH_PREFIX) {
		return true
	}
	return url.pathname.startsWith(
		`${DOCUMENTATION_ALLOWED_IMAGE_GITHUB_PATH_PREFIX}${DOCUMENTATION_PATH_SEPARATOR}`
	)
}

function isAllowedImageProtocol(protocol: string): boolean {
	for (const allowedProtocol of DOCUMENTATION_ALLOWED_IMAGE_PROTOCOLS) {
		if (protocol === allowedProtocol) {
			return true
		}
	}
	return false
}

// Input: base + doc path + relative path. Output: resolved path.
function resolvePath(
	base: string,
	docPath: string,
	relativePath: string
): string {
	const cleaned = relativePath.replace(/^\.\//, '')
	const docSegments = docPath.split('/').slice(0, -1)
	const srcSegments = cleaned.split('/').filter((segment) => segment !== '')
	const stack = [...docSegments]
	for (const seg of srcSegments) {
		if (seg === '..') {
			stack.pop()
		} else if (seg !== '.') {
			stack.push(seg)
		}
	}
	const finalPath = stack.join('/')
	return base === '' ? finalPath : `${base}/${finalPath}`
}
