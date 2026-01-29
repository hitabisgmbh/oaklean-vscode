import {
	resolveDocPath,
	resolveResource,
	rewriteHtmlImages
} from '../../../src/webview/DocumentationView/markdownUtils'

type MockElement = {
	tagName: string
	attrs: Record<string, string>
	removed: boolean
	getAttribute: (name: string) => string | null
	setAttribute: (name: string, value: string) => void
	remove: () => void
}

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

class MockDOMParser {
	parseFromString(html: string) {
		return new MockDocument(html)
	}
}

const parseElements = (html: string) => {
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
			remove() {
				this.removed = true
			}
		}
		elements.push(el)
	}
	return elements
}

const serializeElements = (elements: MockElement[]) => {
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
		// @ts-expect-error test-only DOMParser shim
		global.DOMParser = MockDOMParser
	})

	afterEach(() => {
		global.DOMParser = OriginalDOMParser
	})

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

	test('rewriteHtmlImages rewrites relative images and removes disallowed external images', () => {
		const rewritten = rewriteHtmlImages(
			'<img src="../images/docs/a.png" alt="A">',
			{
				currentPath: 'docs/SensorValues.md',
				resourceBase: 'vscode-webview://root',
				imageWhitelist: []
			}
		)
		expect(rewritten).toContain('vscode-webview://root/images/docs/a.png')

		const removed = rewriteHtmlImages('<img src="https://evil.test/img.png">', {
			currentPath: 'docs/SensorValues.md',
			resourceBase: 'vscode-webview://root',
			imageWhitelist: []
		})
		expect(removed.trim()).toBe('')
	})
})
