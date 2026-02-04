import { resolveDocumentationLink } from '../../../src/webview/DocumentationView/useDocumentationInteractions'
import { DocumentationFile } from '../../../src/protocols/DocumentationViewProtocol'

describe('DocumentationView link resolution', () => {
	// Fixture docs for link resolution scenarios.
	const files: DocumentationFile[] = [
		{ path: 'docs/README.md', name: 'README.md', content: '' },
		{ path: 'docs/abc/README.md', name: 'README.md', content: '' },
		{
			path: 'docs/abc/FileMethodList.md',
			name: 'FileMethodList.md',
			content: ''
		}
	]
	const filePathMap = new Map<string, string>()
	for (const file of files) {
		filePathMap.set(file.path.toLowerCase(), file.path)
	}

	// Resolves in-page anchors without touching the filesystem.
	test('resolves anchor links', () => {
		const resolved = resolveDocumentationLink(
			'#intro',
			'docs/README.md',
			filePathMap
		)
		expect(resolved.type).toBe('anchor')
		if (resolved.type === 'anchor') {
			expect(resolved.anchor).toBe('intro')
		}
	})

	// Passes through external URLs.
	test('resolves external links', () => {
		const resolved = resolveDocumentationLink(
			'https://example.com',
			'docs/README.md',
			filePathMap
		)
		expect(resolved.type).toBe('external')
		if (resolved.type === 'external') {
			expect(resolved.href).toBe('https://example.com')
		}
	})

	// Resolves relative doc links within the current folder.
	test('resolves relative doc links within the same folder', () => {
		const resolved = resolveDocumentationLink(
			'./FileMethodList.md',
			'docs/abc/README.md',
			filePathMap
		)
		expect(resolved.type).toBe('doc')
		if (resolved.type === 'doc') {
			expect(resolved.targetPath).toBe('docs/abc/FileMethodList.md')
			expect(resolved.missingPath).toBeUndefined()
		}
	})

	// Flags missing relative doc links with missingPath.
	test('marks missing doc links with a missing path', () => {
		const resolved = resolveDocumentationLink(
			'./FileMethodList.md',
			'docs/README.md',
			filePathMap
		)
		expect(resolved.type).toBe('doc')
		if (resolved.type === 'doc') {
			expect(resolved.missingPath).toBe('docs/FileMethodList.md')
			expect(resolved.targetPath).toBe('docs/README.md')
		}
	})

	// Resolves relative links that navigate to a parent directory.
	test('resolves parent folder doc links', () => {
		const resolved = resolveDocumentationLink(
			'../README.md',
			'docs/abc/README.md',
			filePathMap
		)
		expect(resolved.type).toBe('doc')
		if (resolved.type === 'doc') {
			expect(resolved.targetPath).toBe('docs/README.md')
			expect(resolved.anchor).toBeUndefined()
		}
	})

	// Ignores query params when resolving markdown file paths.
	test('resolves doc links with query params and anchor', () => {
		const resolved = resolveDocumentationLink(
			'./FileMethodList.md?x=1#overview',
			'docs/abc/README.md',
			filePathMap
		)
		expect(resolved.type).toBe('doc')
		if (resolved.type === 'doc') {
			expect(resolved.targetPath).toBe('docs/abc/FileMethodList.md')
			expect(resolved.anchor).toBe('overview')
			expect(resolved.missingPath).toBeUndefined()
		}
	})
})
