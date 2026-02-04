import * as fs from 'fs'
import * as path from 'path'

import { resolveResource } from '../../../src/webview/DocumentationView/markdownUtils'

// Absolute docs root for path resolution.
const DOCS_ROOT = path.resolve(__dirname, '../../../docs')
const REPO_ROOT = path.resolve(__dirname, '../../..')
// Extensions treated as documentation sources.
const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown'])
// Regex helpers for stripping or extracting content.
const CODE_FENCE_REGEX = /```[\s\S]*?```/g
const INLINE_CODE_REGEX = /`[^`]*`/g
const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)]\(([^)]+)\)/g
const HTML_IMAGE_TAG_REGEX = /<img\s+[^>]*>/gi
const HTML_ATTR_REGEX = /(\w+)=["']([^"']*)["']/g
const HTML_ATTR_ALT = 'alt'
const HTML_ATTR_SRC = 'src'
const EMPTY_TEXT = ''
// Protocol/anchor prefixes that do not resolve to local files.
const HTTP_PREFIX = 'http://'
const HTTPS_PREFIX = 'https://'
const DATA_PREFIX = 'data:'
const MAILTO_PREFIX = 'mailto:'

// Recursively collect markdown files from the docs tree.
function collectMarkdownFiles(dir: string): string[] {
	const entries = fs.readdirSync(dir, { withFileTypes: true })
	const files: string[] = []
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			const nested = collectMarkdownFiles(fullPath)
			for (const item of nested) {
				files.push(item)
			}
		} else if (entry.isFile()) {
			const ext = path.extname(entry.name).toLowerCase()
			if (MARKDOWN_EXTENSIONS.has(ext)) {
				files.push(fullPath)
			}
		}
	}
	return files
}

// Convert Windows path separators to POSIX for consistent doc paths.
function toPosixPath(value: string): string {
	if (path.sep === '/') {
		return value
	}
	return value.split(path.sep).join('/')
}

// Strip code blocks and inline code to avoid false-positive matches.
function stripCode(content: string): string {
	const withoutBlocks = content.replace(CODE_FENCE_REGEX, '')
	return withoutBlocks.replace(INLINE_CODE_REGEX, '')
}

type ImageTarget = {
	src: string
	alt: string
}

// Identify links that should not be resolved locally.
function isExternalLink(href: string): boolean {
	const lower = href.toLowerCase()
	return (
		lower.startsWith(HTTP_PREFIX) ||
		lower.startsWith(HTTPS_PREFIX) ||
		lower.startsWith(MAILTO_PREFIX) ||
		lower.startsWith(DATA_PREFIX)
	)
}

// Extract all markdown and HTML image sources with alt text.
function collectImageTargets(content: string): ImageTarget[] {
	const sanitized = stripCode(content)
	const markdownImages = extractMarkdownImages(sanitized)
	const htmlImages = extractHtmlImages(sanitized)
	return [...markdownImages, ...htmlImages]
}

describe('Documentation View assets', () => {
	// Missing local images should still provide alt text for UI fallback.
	test('missing image references include alt text', () => {
		const docs = collectMarkdownFiles(DOCS_ROOT)
		const missingAltText: string[] = []
		for (const doc of docs) {
			const content = fs.readFileSync(doc, 'utf8')
			const targets = collectImageTargets(content)
			const relativeDocPath = toPosixPath(path.relative(DOCS_ROOT, doc))
			for (const target of targets) {
				if (isExternalLink(target.src)) {
					continue
				}
				// Resolve image resources relative to the doc path.
				const resolved = resolveResource('', relativeDocPath, target.src)
				const absolute = path.resolve(REPO_ROOT, resolved)
				if (fs.existsSync(absolute) === false) {
					if (target.alt.trim() === EMPTY_TEXT) {
						missingAltText.push(`${relativeDocPath} -> ${target.src}`)
					}
				}
			}
		}
		expect(missingAltText).toEqual([])
	})
})

function extractMarkdownImages(content: string): ImageTarget[] {
	const images: ImageTarget[] = []
	let match: RegExpExecArray | null
	while ((match = MARKDOWN_IMAGE_REGEX.exec(content)) !== null) {
		const alt = match[1]?.trim() ?? EMPTY_TEXT
		const src = match[2]?.trim() ?? EMPTY_TEXT
		if (src !== EMPTY_TEXT) {
			images.push({ src, alt })
		}
	}
	return images
}

function extractHtmlImages(content: string): ImageTarget[] {
	const images: ImageTarget[] = []
	let match: RegExpExecArray | null
	while ((match = HTML_IMAGE_TAG_REGEX.exec(content)) !== null) {
		const attrs = extractHtmlAttributes(match[0])
		const src = attrs[HTML_ATTR_SRC] ?? EMPTY_TEXT
		if (src !== EMPTY_TEXT) {
			images.push({
				src,
				alt: attrs[HTML_ATTR_ALT] ?? EMPTY_TEXT
			})
		}
	}
	return images
}

function extractHtmlAttributes(tag: string): Record<string, string> {
	const attrs: Record<string, string> = {}
	let match: RegExpExecArray | null
	while ((match = HTML_ATTR_REGEX.exec(tag)) !== null) {
		attrs[match[1]] = match[2]
	}
	return attrs
}
