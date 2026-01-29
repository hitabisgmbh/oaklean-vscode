import { resolveDocumentationLink } from '../../../src/webview/DocumentationView/useDocumentationInteractions'
import { DocumentationFile } from '../../../src/protocols/DocumentationViewProtocol'

describe('DocumentationView link resolution', () => {
	const files: DocumentationFile[] = [
		{ path: 'docs/README.md', name: 'README.md', content: '' },
		{ path: 'docs/abc/README.md', name: 'README.md', content: '' },
		{
			path: 'docs/abc/FileMethodList.md',
			name: 'FileMethodList.md',
			content: ''
		}
	]

	test('resolves anchor links', () => {
		const resolved = resolveDocumentationLink('#intro', 'docs/README.md', files)
		expect(resolved.type).toBe('anchor')
		if (resolved.type === 'anchor') {
			expect(resolved.anchor).toBe('intro')
		}
	})

	test('resolves external links', () => {
		const resolved = resolveDocumentationLink(
			'https://example.com',
			'docs/README.md',
			files
		)
		expect(resolved.type).toBe('external')
		if (resolved.type === 'external') {
			expect(resolved.href).toBe('https://example.com')
		}
	})

	test('resolves relative doc links within the same folder', () => {
		const resolved = resolveDocumentationLink(
			'./FileMethodList.md',
			'docs/abc/README.md',
			files
		)
		expect(resolved.type).toBe('doc')
		if (resolved.type === 'doc') {
			expect(resolved.targetPath).toBe('docs/abc/FileMethodList.md')
			expect(resolved.missingPath).toBeUndefined()
		}
	})

	test('marks missing doc links with a missing path', () => {
		const resolved = resolveDocumentationLink(
			'./FileMethodList.md',
			'docs/README.md',
			files
		)
		expect(resolved.type).toBe('doc')
		if (resolved.type === 'doc') {
			expect(resolved.missingPath).toBe('docs/FileMethodList.md')
			expect(resolved.targetPath).toBe('docs/README.md')
		}
	})

	test('resolves parent folder doc links', () => {
		const resolved = resolveDocumentationLink(
			'../README.md',
			'docs/abc/README.md',
			files
		)
		expect(resolved.type).toBe('doc')
		if (resolved.type === 'doc') {
			expect(resolved.targetPath).toBe('docs/README.md')
			expect(resolved.anchor).toBeUndefined()
		}
	})
})
