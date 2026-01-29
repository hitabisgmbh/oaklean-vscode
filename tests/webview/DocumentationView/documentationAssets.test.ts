import * as fs from 'fs'
import * as path from 'path'

import {
	resolveDocPath,
	resolveResource
} from '../../../src/webview/DocumentationView/markdownUtils'

const DOCS_ROOT = path.resolve(__dirname, '../../../docs')
const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown'])
const CODE_FENCE_REGEX = /```[\s\S]*?```/g
const INLINE_CODE_REGEX = /`[^`]*`/g
const MARKDOWN_IMAGE_REGEX = /!\[[^\]]*]\(([^)]+)\)/g
const MARKDOWN_LINK_REGEX = /\[[^\]]+]\(([^)]+)\)/g
const HTML_IMAGE_REGEX = /<img\s+[^>]*src=["']([^"']+)["']/gi
const HTML_LINK_REGEX = /<a\s+[^>]*href=["']([^"']+)["']/gi
const HTTP_PREFIX = 'http://'
const HTTPS_PREFIX = 'https://'
const DATA_PREFIX = 'data:'
const MAILTO_PREFIX = 'mailto:'
const ANCHOR_PREFIX = '#'

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

function toPosixPath(value: string): string {
	if (path.sep === '/') {
		return value
	}
	return value.split(path.sep).join('/')
}

function stripCode(content: string): string {
	const withoutBlocks = content.replace(CODE_FENCE_REGEX, '')
	return withoutBlocks.replace(INLINE_CODE_REGEX, '')
}

function extractMatches(regex: RegExp, content: string): string[] {
	const matches: string[] = []
	let match: RegExpExecArray | null
	while ((match = regex.exec(content)) !== null) {
		const value = match[1]?.trim() ?? ''
		if (value !== '') {
			matches.push(value)
		}
	}
	return matches
}

function isExternalLink(href: string): boolean {
	const lower = href.toLowerCase()
	return (
		lower.startsWith(HTTP_PREFIX) ||
		lower.startsWith(HTTPS_PREFIX) ||
		lower.startsWith(MAILTO_PREFIX) ||
		lower.startsWith(DATA_PREFIX)
	)
}

function collectLinkTargets(content: string): string[] {
	const sanitized = stripCode(content)
	const withoutImages = sanitized.replace(MARKDOWN_IMAGE_REGEX, '')
	const markdownLinks = extractMatches(MARKDOWN_LINK_REGEX, withoutImages)
	const htmlLinks = extractMatches(HTML_LINK_REGEX, sanitized)
	return [...markdownLinks, ...htmlLinks]
}

function collectImageTargets(content: string): string[] {
	const sanitized = stripCode(content)
	const markdownImages = extractMatches(MARKDOWN_IMAGE_REGEX, sanitized)
	const htmlImages = extractMatches(HTML_IMAGE_REGEX, sanitized)
	return [...markdownImages, ...htmlImages]
}

describe('Documentation View assets', () => {
	test('all markdown links resolve to existing targets', () => {
		const docs = collectMarkdownFiles(DOCS_ROOT)
		const missing: string[] = []
		for (const doc of docs) {
			const content = fs.readFileSync(doc, 'utf8')
			const targets = collectLinkTargets(content)
			const relativeDocPath = toPosixPath(path.relative(DOCS_ROOT, doc))
			for (const target of targets) {
				if (target.startsWith(ANCHOR_PREFIX)) {
					continue
				}
				if (isExternalLink(target)) {
					continue
				}
				const [pathPart] = target.split('#')
				if (pathPart === '') {
					continue
				}
				const resolved = resolveDocPath(relativeDocPath, pathPart)
				const absolute = path.resolve(DOCS_ROOT, resolved)
				if (fs.existsSync(absolute) === false) {
					missing.push(`${relativeDocPath} -> ${pathPart}`)
				}
			}
		}
		expect(missing).toEqual([])
	})

	test('all markdown images resolve to existing files', () => {
		const docs = collectMarkdownFiles(DOCS_ROOT)
		const missing: string[] = []
		for (const doc of docs) {
			const content = fs.readFileSync(doc, 'utf8')
			const targets = collectImageTargets(content)
			const relativeDocPath = toPosixPath(path.relative(DOCS_ROOT, doc))
			for (const target of targets) {
				if (isExternalLink(target)) {
					continue
				}
				const resolved = resolveResource('', relativeDocPath, target)
				const absolute = path.resolve(DOCS_ROOT, resolved)
				if (fs.existsSync(absolute) === false) {
					missing.push(`${relativeDocPath} -> ${target}`)
				}
			}
		}
		expect(missing).toEqual([])
	})
})
