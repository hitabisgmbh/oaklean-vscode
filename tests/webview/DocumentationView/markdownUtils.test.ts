import * as fs from 'fs'
import * as path from 'path'

import {
	resolveDocPath,
	resolveResource,
	rewriteHtmlImages,
	rewriteHtmlLinks
} from '../../../src/webview/DocumentationView/markdownUtils'

const REPO_ROOT = path.resolve(__dirname, '../../..')
const RESOURCE_BASE = 'vscode-webview://root'
const DOC_PATH_README = 'docs/README.md'
const DOC_PATH_CURRENT = DOC_PATH_README
const DOC_PATH_IMAGE = 'docs/FileTree.md'
const DOC_LINK_DISABLED_CLASS = 'doc-link-disabled'
const HTML_ATTR_CLASS = 'class'
const HTML_ATTR_HREF = 'href'
const HTML_ATTR_SRC = 'src'
const HTML_CLASS_SEPARATOR = ' '
const HTML_TAG_IMAGE = '<img'
const IMAGE_ALT_EXISTING = 'File tree'
const IMAGE_ALT_MISSING = 'File list'
const LINK_TEXT_EXISTING = 'Existing'
const LINK_TEXT_MISSING = 'Missing'
const LINK_TO_EXISTING = './README.md'
const LINK_TO_MISSING = './Missing.md'
const IMAGE_PATH_EXISTING = '../images/docs/file-tree.png'
const IMAGE_PATH_MISSING = '../images/docs/file-list-missing.png'
const EXTERNAL_IMAGE_URL_DENIED = 'https://evil.test/img.png'
const EXTERNAL_IMAGE_URL_OAKLEAN_HTTPS =
	'https://www.oaklean.io/assets/logo.png'
const EXTERNAL_IMAGE_URL_OAKLEAN_HTTP = 'http://www.oaklean.io/assets/logo.png'
const EXTERNAL_IMAGE_URL_GITHUB_HTTPS =
	'https://github.com/hitabisgmbh/oaklean/raw/main/images/logo.png'
const EXTERNAL_IMAGE_URL_GITHUB_HTTP =
	'http://github.com/hitabisgmbh/oaklean/raw/main/images/logo.png'
const EXTERNAL_IMAGE_URL_GITHUB_DENIED =
	'https://github.com/hitabisgmbh/other/raw/main/logo.png'
const IMAGE_PATH_EXISTING_ABSOLUTE = path.resolve(
	REPO_ROOT,
	'images/docs/file-tree.png'
)
const IMAGE_PATH_MISSING_ABSOLUTE = path.resolve(
	REPO_ROOT,
	'images/docs/file-list-missing.png'
)

// Minimal mock element for DOM parsing in Node tests.
type MockElement = {
	tagName: string
	attrs: Record<string, string>
	removed: boolean
	getAttribute: (name: string) => string | null
	setAttribute: (name: string, value: string) => void
	removeAttribute: (name: string) => void
	classList: { add: (value: string) => void }
	remove: () => void
}

// Lightweight DOM document mock used by rewriteHtmlImages.
class MockDocument {
	private elements: MockElement[] = []
	public body: { innerHTML: string }

	constructor(private html: string) {
		this.elements = parseElements(html)
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this
		this.body = {
			get innerHTML() {
				return serializeElements(self.elements)
			},
			set innerHTML(value: string) {
				self.elements = parseElements(value)
			}
		}
	}

	querySelectorAll(selector: string) {
		const tag = selector.toLowerCase()
		return this.elements.filter(
			(el) => el.tagName === tag && el.removed === false
		)
	}
}

// Mock DOMParser that returns our test document.
class MockDOMParser {
	parseFromString(html: string) {
		return new MockDocument(html)
	}
}

// Parse <img> and <a> tags into mock elements.
function parseElements(html: string): MockElement[] {
	const elements: MockElement[] = []
	const tagRegex = /<(img|a)\s+[^>]*>/gi
	let match: RegExpExecArray | null
	while ((match = tagRegex.exec(html))) {
		const tagName = match[1].toLowerCase()
		const tag = match[0]
		const attrs: Record<string, string> = {}
		const attrRegex = /(\w+)=["']([^"']*)["']/g
		let attrMatch: RegExpExecArray | null
		while ((attrMatch = attrRegex.exec(tag))) {
			attrs[attrMatch[1]] = attrMatch[2]
		}
		const classList = {
			add(value: string) {
				const existing = attrs[HTML_ATTR_CLASS]
				if (existing === undefined || existing === '') {
					attrs[HTML_ATTR_CLASS] = value
					return
				}
				const parts = existing
					.split(HTML_CLASS_SEPARATOR)
					.filter((part) => part !== '')
				if (parts.includes(value) === false) {
					attrs[HTML_ATTR_CLASS] = [...parts, value].join(HTML_CLASS_SEPARATOR)
				}
			}
		}
		const el: MockElement = {
			tagName,
			attrs,
			removed: false,
			getAttribute(name: string) {
				return this.attrs[name] ?? null
			},
			setAttribute(name: string, value: string) {
				this.attrs[name] = value
			},
			removeAttribute(name: string) {
				delete this.attrs[name]
			},
			classList,
			remove() {
				this.removed = true
			}
		}
		elements.push(el)
	}
	return elements
}

// Serialize remaining mock elements back into HTML.
function serializeElements(elements: MockElement[]): string {
	const parts: string[] = []
	for (const el of elements) {
		if (el.removed === true) {
			continue
		}
		const attrs = Object.entries(el.attrs)
			.map(([key, value]) => `${key}="${value}"`)
			.join(' ')
		parts.push(`<${el.tagName}${attrs ? ' ' + attrs : ''}>`)
	}
	return parts.join('')
}

describe('DocumentationView markdown utils', () => {
	const OriginalDOMParser = global.DOMParser

	beforeEach(() => {
		// Inject DOMParser shim for Node environment.
		// @ts-expect-error test-only DOMParser shim
		global.DOMParser = MockDOMParser
	})

	afterEach(() => {
		// Restore global DOMParser after each test.
		global.DOMParser = OriginalDOMParser
	})

	// Ensures relative links are resolved against current doc path.
	test('resolveDocPath resolves relative markdown links', () => {
		expect(resolveDocPath('docs/README.md', './FileMethodList.md')).toBe(
			'docs/FileMethodList.md'
		)
		expect(resolveDocPath('docs/abc/README.md', './FileMethodList.md')).toBe(
			'docs/abc/FileMethodList.md'
		)
		expect(resolveDocPath('docs/abc/README.md', '../SensorValues.md')).toBe(
			'docs/SensorValues.md'
		)
	})

	// Ensures image paths are rewritten into webview resource URIs.
	test('resolveResource rewrites image paths relative to the doc path', () => {
		const resolved = resolveResource(
			'vscode-webview://root',
			'docs/SensorValues.md',
			'../images/docs/sensor-values-overview.png'
		)
		expect(resolved).toBe(
			'vscode-webview://root/images/docs/sensor-values-overview.png'
		)
	})

	// Ensures HTML image sources are rewritten and disallowed externals removed.
	test('rewriteHtmlImages rewrites relative images and removes disallowed external images', () => {
		const rewritten = rewriteHtmlImages(
			'<img src="../images/docs/a.png" alt="A">',
			{
				currentPath: 'docs/SensorValues.md',
				resourceBase: 'vscode-webview://root'
			}
		)
		expect(rewritten).toContain('vscode-webview://root/images/docs/a.png')

		const removed = rewriteHtmlImages(
			`<img src="${EXTERNAL_IMAGE_URL_DENIED}">`,
			{
				currentPath: 'docs/SensorValues.md',
				resourceBase: 'vscode-webview://root'
			}
		)
		expect(removed.trim()).toBe('')
	})

	// Ensures only the allowed oaklean/github image URLs pass the whitelist.
	test('rewriteHtmlImages allows only oaklean and oaklean repo urls', () => {
		const oakleanHttps = rewriteHtmlImages(
			`<img src="${EXTERNAL_IMAGE_URL_OAKLEAN_HTTPS}">`,
			{
				currentPath: DOC_PATH_IMAGE,
				resourceBase: RESOURCE_BASE
			}
		)
		expect(oakleanHttps).toContain(EXTERNAL_IMAGE_URL_OAKLEAN_HTTPS)

		const oakleanHttp = rewriteHtmlImages(
			`<img src="${EXTERNAL_IMAGE_URL_OAKLEAN_HTTP}">`,
			{
				currentPath: DOC_PATH_IMAGE,
				resourceBase: RESOURCE_BASE
			}
		)
		expect(oakleanHttp).toContain(EXTERNAL_IMAGE_URL_OAKLEAN_HTTP)

		const githubHttps = rewriteHtmlImages(
			`<img src="${EXTERNAL_IMAGE_URL_GITHUB_HTTPS}">`,
			{
				currentPath: DOC_PATH_IMAGE,
				resourceBase: RESOURCE_BASE
			}
		)
		expect(githubHttps).toContain(EXTERNAL_IMAGE_URL_GITHUB_HTTPS)

		const githubHttp = rewriteHtmlImages(
			`<img src="${EXTERNAL_IMAGE_URL_GITHUB_HTTP}">`,
			{
				currentPath: DOC_PATH_IMAGE,
				resourceBase: RESOURCE_BASE
			}
		)
		expect(githubHttp).toContain(EXTERNAL_IMAGE_URL_GITHUB_HTTP)

		const githubDenied = rewriteHtmlImages(
			`<img src="${EXTERNAL_IMAGE_URL_GITHUB_DENIED}">`,
			{
				currentPath: DOC_PATH_IMAGE,
				resourceBase: RESOURCE_BASE
			}
		)
		expect(githubDenied.trim()).toBe('')
	})

	// Ensures existing local images remain rendered in HTML.
	test('rewriteHtmlImages keeps existing local images', () => {
		expect(fs.existsSync(IMAGE_PATH_EXISTING_ABSOLUTE)).toBe(true)
		const html = `<img src="${IMAGE_PATH_EXISTING}" alt="${IMAGE_ALT_EXISTING}">`
		const rewritten = rewriteHtmlImages(html, {
			currentPath: DOC_PATH_IMAGE,
			resourceBase: RESOURCE_BASE
		})
		const expectedSrc = resolveResource(
			RESOURCE_BASE,
			DOC_PATH_IMAGE,
			IMAGE_PATH_EXISTING
		)
		expect(rewritten).toContain(HTML_TAG_IMAGE)
		expect(rewritten).toContain(`${HTML_ATTR_SRC}="${expectedSrc}"`)
		expect(rewritten).toContain(IMAGE_ALT_EXISTING)
	})

	// Ensures missing local images still render as broken placeholders.
	test('rewriteHtmlImages keeps missing local images', () => {
		expect(fs.existsSync(IMAGE_PATH_MISSING_ABSOLUTE)).toBe(false)
		const html = `<img src="${IMAGE_PATH_MISSING}" alt="${IMAGE_ALT_MISSING}">`
		const rewritten = rewriteHtmlImages(html, {
			currentPath: DOC_PATH_IMAGE,
			resourceBase: RESOURCE_BASE
		})
		const expectedSrc = resolveResource(
			RESOURCE_BASE,
			DOC_PATH_IMAGE,
			IMAGE_PATH_MISSING
		)
		expect(rewritten).toContain(HTML_TAG_IMAGE)
		expect(rewritten).toContain(`${HTML_ATTR_SRC}="${expectedSrc}"`)
		expect(rewritten).toContain(IMAGE_ALT_MISSING)
	})

	// Ensures missing doc links are disabled in rendered HTML.
	test('rewriteHtmlLinks disables missing doc links', () => {
		const docPaths = new Set<string>([DOC_PATH_README])
		const html = `<a href="${LINK_TO_MISSING}">${LINK_TEXT_MISSING}</a>`
		const rewritten = rewriteHtmlLinks(html, {
			currentPath: DOC_PATH_CURRENT,
			docPaths
		})
		expect(rewritten).toContain(DOC_LINK_DISABLED_CLASS)
		expect(rewritten).not.toContain(`${HTML_ATTR_HREF}=`)
	})

	// Ensures existing doc links remain clickable.
	test('rewriteHtmlLinks preserves existing doc links', () => {
		const docPaths = new Set<string>([DOC_PATH_README])
		const html = `<a href="${LINK_TO_EXISTING}">${LINK_TEXT_EXISTING}</a>`
		const rewritten = rewriteHtmlLinks(html, {
			currentPath: DOC_PATH_CURRENT,
			docPaths
		})
		expect(rewritten).toContain(`${HTML_ATTR_HREF}="${LINK_TO_EXISTING}"`)
		expect(rewritten).not.toContain(DOC_LINK_DISABLED_CLASS)
	})
})
