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
		typographer: true
	})

	const originalImage = md.renderer.rules.image
	md.renderer.rules.image = (
		tokens: Token[],
		idx: number,
		options: MarkdownOptions,
		env: any,
		self: Renderer
	) => {
		const token = tokens[idx]
		const src = token.attrGet('src') || ''
		if (!src) {
			return ''
		}
		if (src.startsWith('data:')) {
			return originalImage
				? originalImage(tokens, idx, options, env, self)
				: self.renderToken(tokens, idx, options)
		}
		if (isExternalHttpUrl(src)) {
			const whitelist = (env?.imageWhitelist as string[]) || []
			if (!isWhitelistedUrl(src, whitelist)) {
				return ''
			}
			return originalImage
				? originalImage(tokens, idx, options, env, self)
				: self.renderToken(tokens, idx, options)
		}
		if (env?.resourceBase && env?.currentPath) {
			const resolved = resolveResource(env.resourceBase, env.currentPath, src)
			token.attrSet('src', resolved)
		}
		return originalImage
			? originalImage(tokens, idx, options, env, self)
			: self.renderToken(tokens, idx, options)
	}

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
	const plain = stripMarkdown(content)
	const words = plain.replace(/\s+/g, ' ').trim().split(' ')
	const q = query.toLowerCase()
	const matchIndex = words.findIndex((word) => word.toLowerCase().includes(q))
	if (matchIndex === -1) {
		return words.slice(0, 20).join(' ')
	}

	const beforeCount = 8
	const afterCount = 8
	const start = Math.max(0, matchIndex - beforeCount)
	const end = Math.min(words.length, matchIndex + afterCount + 1)
	const snippetWords = words.slice(start, end)
	const relativeIndex = matchIndex - start
	const word = snippetWords[relativeIndex]
	snippetWords[relativeIndex] = word.replace(new RegExp(q, 'i'), (match) => `<strong>${match}</strong>`)
	return snippetWords.join(' ')
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
	const suffix = finalPath.replace(/^docs\//i, '')
	return `${base}/${suffix}`
}

function stripMarkdown(text: string) {
	return text
		.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/[*_~]+/g, '')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/^>\s+/gm, '')
		.replace(/^[\s>*+-]\s+/gm, '')
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
