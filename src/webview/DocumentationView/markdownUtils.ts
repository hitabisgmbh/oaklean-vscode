import MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token'
import type Renderer from 'markdown-it/lib/renderer'
import type { Options as MarkdownOptions } from 'markdown-it'

const slugify = (str: string) =>
	str
		.toLowerCase()
		.replace(/[^\w]+/g, '-')
		.replace(/^-+|-+$/g, '')

export const markdown = createMarkdownRenderer()

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
			titleToken?.children?.reduce((acc: string, t: Token) => acc + (t.content || ''), '') || ''
		const slug = slugify(title)
		tokens[idx].attrSet('id', slug)
		return originalHeadingOpen
			? originalHeadingOpen(tokens, idx, options, env, self)
			: self.renderToken(tokens, idx, options)
	}

	return md
}

export function buildSnippet(content: string, query: string) {
	const plain = normalizeSearchContent(content)
	const words = plain.split(' ').filter(Boolean)
	const q = query.toLowerCase()
	const matchIndex = words.findIndex((word) => word.toLowerCase().includes(q))
	if (matchIndex === -1) {
		return words.slice(0, 20).join(' ')
	}

	return buildSnippetAt(content, query, findWordStartIndex(words, matchIndex))
}

export function buildSnippetAt(content: string, query: string, matchIndex: number) {
	const plain = normalizeSearchContent(content)
	if (!plain) return ''
	const words = plain.split(' ').filter(Boolean)
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

	const beforeCount = 8
	const afterCount = 8
	const start = Math.max(0, wordIndex - beforeCount)
	const end = Math.min(words.length, wordIndex + afterCount + 1)
	const snippetWords = words.slice(start, end)
	const snippet = snippetWords.join(' ')
	const pattern = new RegExp(escapeRegExp(query), 'i')
	return snippet.replace(pattern, (match) => `<strong>${match}</strong>`)
}

export function rewriteHtmlImages(
	html: string,
	options: { currentPath: string; resourceBase: string; imageWhitelist: string[] }
) {
	const parser = new DOMParser()
	const doc = parser.parseFromString(html, 'text/html')
	const images = Array.from(doc.querySelectorAll('img'))

	for (const img of images) {
		const src = img.getAttribute('src') || ''
		if (!src) {
			img.remove()
			continue
		}
		if (src.startsWith('data:')) {
			continue
		}
		if (/^vscode-webview-resource:|^vscode-resource:|^vscode-webview:/i.test(src)) {
			continue
		}
		if (isExternalHttpUrl(src)) {
			if (!isWhitelistedUrl(src, options.imageWhitelist)) {
				img.remove()
			}
			continue
		}
		if (options.resourceBase && options.currentPath) {
			img.setAttribute('src', resolveResource(options.resourceBase, options.currentPath, src))
		}
	}

	return doc.body.innerHTML
}

export function rewriteHtmlLinks(
	html: string,
	options: { currentPath: string; docPaths: Set<string> }
) {
	const parser = new DOMParser()
	const doc = parser.parseFromString(html, 'text/html')
	const anchors = Array.from(doc.querySelectorAll('a'))

	for (const anchor of anchors) {
		const href = anchor.getAttribute('href') || ''
		if (!href) continue
		if (href.startsWith('#')) continue
		if (isExternalHttpUrl(href) || href.startsWith('mailto:')) continue
		if (/^vscode-webview-resource:|^vscode-resource:|^vscode-webview:/i.test(href)) {
			continue
		}
		const [pathPart] = href.split('#')
		if (!pathPart) continue
		const lowerPath = pathPart.toLowerCase()
		if (!lowerPath.endsWith('.md') && !lowerPath.endsWith('.markdown')) {
			continue
		}
		const resolved = resolveDocPath(options.currentPath, pathPart)
		if (!options.docPaths.has(resolved)) {
			anchor.removeAttribute('href')
			anchor.classList.add('doc-link-disabled')
		}
	}

	return doc.body.innerHTML
}

export function resolveResource(base: string, docPath: string, relativeSrc: string) {
	const cleaned = relativeSrc.replace(/^\.\//, '')
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
	return `${base}/${finalPath}`
}

export function resolveDocPath(docPath: string, relativePath: string) {
	const cleaned = relativePath.replace(/^\.\//, '')
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
	return stack.join('/')
}

export function stripMarkdown(text: string) {
	return text
		.replace(/<[^>]*>/g, '')
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/[*_~]+/g, '')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/^>\s+/gm, '')
		.replace(/^[\s>*+-]\s+/gm, '')
}

export function normalizeSearchContent(text: string) {
	let cleaned = stripMarkdown(text)
	cleaned = cleaned.replace(/^\s*\|?[\s:-]+(\|[\s:-]+)+\|?\s*$/gm, ' ')
	cleaned = cleaned.replace(/\|/g, ' ')
	return cleaned.replace(/\s+/g, ' ').trim()
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findWordStartIndex(words: string[], wordIndex: number) {
	let index = 0
	for (let i = 0; i < wordIndex; i++) {
		index += words[i].length + 1
	}
	return index
}

function isExternalHttpUrl(src: string) {
	return /^https?:\/\//i.test(src)
}

function isWhitelistedUrl(src: string, whitelist: string[]) {
	for (const entry of whitelist) {
		const trimmed = entry.trim()
		if (!trimmed) continue
		const lower = trimmed.toLowerCase()
		if (lower.startsWith('http(s)://')) {
			const rest = trimmed.slice('http(s)://'.length)
			if (src.startsWith(`http://${rest}`) || src.startsWith(`https://${rest}`)) {
				return true
			}
		}
		if (/^https?:\/\//i.test(trimmed) && !trimmed.includes('*') && trimmed.includes('/')) {
			if (src.startsWith(trimmed)) {
				return true
			}
		}
		let url: URL
		try {
			url = new URL(src)
		} catch {
			continue
		}
		const schemes = lower.startsWith('http(s)://')
			? ['http:', 'https:']
			: lower.startsWith('https://')
				? ['https:']
				: lower.startsWith('http://')
					? ['http:']
					: ['http:', 'https:']
		if (!schemes.includes(url.protocol)) continue
		let hostPattern = trimmed
			.replace(/^http\(s\):\/\//i, '')
			.replace(/^https?:\/\//i, '')
			.split('/')[0]
		hostPattern = hostPattern.replace(/^\*\./, '').replace(/^\*/, '')
		if (!hostPattern) continue
		const host = url.hostname.toLowerCase()
		const pattern = hostPattern.toLowerCase()
		if (host === pattern || host.endsWith(`.${pattern}`)) {
			return true
		}
	}
	return false
}
