import {
	createSearchIndex,
	searchDocs
} from '../../../src/webview/DocumentationView/searchUtils'
import { normalizeSearchContent } from '../../../src/webview/DocumentationView/markdownUtils'
import { SEARCH_RESULTS_MAX_DEFAULT } from '../../../src/constants/documentationSearch'

function assertSearchIndex(
	value: ReturnType<typeof createSearchIndex>
): asserts value is NonNullable<ReturnType<typeof createSearchIndex>> {
	if (value === null) {
		throw new Error('Expected search index to be created')
	}
}

describe('DocumentationView search utils', () => {
	test('returns one result per occurrence within a document', () => {
		const files = [
			{
				path: 'SensorValues.md',
				name: 'SensorValues.md',
				content: 'profilerHits profilerHits profilerHits\\nother profilerHits'
			}
		]
		const searchIndex = createSearchIndex(files)
		assertSearchIndex(searchIndex)
		const results = searchDocs(
			files,
			searchIndex,
			'profilerHits',
			SEARCH_RESULTS_MAX_DEFAULT
		)
		expect(results).toHaveLength(4)
		expect(new Set(results.map((r) => r.occurrence))).toEqual(
			new Set([0, 1, 2, 3])
		)
	})

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
		const searchIndex = createSearchIndex(files)
		assertSearchIndex(searchIndex)
		const results = searchDocs(
			files,
			searchIndex,
			'CPUTime',
			SEARCH_RESULTS_MAX_DEFAULT
		)
		expect(results.length).toBeGreaterThan(0)
	})

	test('normalizeSearchContent removes HTML and table layout', () => {
		const raw =
			'<img src="../images/a.png" width="300"/>\\n| A | B |\\n|---|---|\\nText'
		const normalized = normalizeSearchContent(raw)
		expect(normalized).toContain('Text')
		expect(normalized).not.toContain('<img')
		expect(normalized).not.toContain('|')
		expect(normalized).not.toContain('width')
	})
})
