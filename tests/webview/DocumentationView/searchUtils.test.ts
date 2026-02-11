import {
	createSearchIndex,
	searchDocs
} from '../../../src/webview/DocumentationView/searchUtils'
import { normalizeMarkdownContent } from '../../../src/webview/DocumentationView/markdownUtils'
import { SEARCH_RESULTS_MAX_DEFAULT } from '../../../src/constants/documentationSearch'

// Assert helper to guard against null search index creation.
function assertSearchIndex(
	value: ReturnType<typeof createSearchIndex>
): asserts value is NonNullable<ReturnType<typeof createSearchIndex>> {
	if (value === null) {
		throw new Error('Expected search index to be created')
	}
}

describe('DocumentationView search utils', () => {
	// Ensures each occurrence in a doc produces a separate result.
	test('returns one result per occurrence within a document', () => {
		const files = [
			{
				path: 'SensorValues.md',
				name: 'SensorValues.md',
				content: 'profilerHits profilerHits profilerHits\\nother profilerHits'
			}
		]
		// Build index and search with a default result cap.
		const searchIndex = createSearchIndex(files)
		assertSearchIndex(searchIndex)
		const results = searchDocs(
			searchIndex,
			'profilerHits',
			SEARCH_RESULTS_MAX_DEFAULT
		)
		expect(results).toHaveLength(4)
		expect(new Set(results.map((r) => r.occurrence))).toEqual(
			new Set([0, 1, 2, 3])
		)
	})

	// Ensures substring matches are found via the index.
	test('finds substring matches via the index', () => {
		const files = [
			{
				path: 'A.md',
				name: 'A.md',
				content: 'selfCPUTime and externCPUTime'
			},
			{
				path: 'B.md',
				name: 'B.md',
				content: 'units unit tests'
			}
		]
		// Search for a substring that appears within larger tokens.
		const searchIndex = createSearchIndex(files)
		assertSearchIndex(searchIndex)
		const results = searchDocs(
			searchIndex,
			'CPUTime',
			SEARCH_RESULTS_MAX_DEFAULT
		)
		expect(results.length).toBeGreaterThan(0)
	})

	// Ensures markdown content is normalized for indexing.
	test('normalizeMarkdownContent removes HTML and table layout', () => {
		const raw =
			'<img src="../images/a.png" width="300"/>\\n| A | B |\\n|---|---|\\nText'
		const normalized = normalizeMarkdownContent(raw)
		expect(normalized).toBe('\\n A B \\n \\nText')
	})
})
