import { describe, expect, it, jest } from '@jest/globals'

import {
	buildReferenceEntry,
	getDisplayName,
	toMetas,
	toSourceNodeIdentifier,
	toUnifiedPathString
} from '../../src/WebViewProviders/EditorFileMethodReferenceView/EditorFileMethodReferenceMapper'

jest.mock('vscode')

describe('EditorFileMethodReferenceMapper', () => {
	it('returns readable name for valid function identifier', () => {
		// "{function:name}" should be converted to plain display label.
		expect(getDisplayName('{function:myFunction}')).toBe('myFunction')
	})

	it('returns empty name for malformed identifier', () => {
		// Invalid identifier formats are intentionally rendered as empty labels.
		expect(getDisplayName('invalid-identifier')).toBe('')
	})

	it('normalizes metadata collections from values(), entries(), and object maps', () => {
		// Mapper accepts different collection shapes and always returns a flat meta array.
		const metaA = { methodName: 'a' }
		const metaB = { methodName: 'b' }
		const metaC = { methodName: 'c' }

		const fromValues = {
			values: () =>
				[
					[1, metaA],
					[2, metaB]
				][Symbol.iterator]()
		}
		const fromEntries = {
			entries: () =>
				[
					['first', metaA],
					['second', metaB]
				][Symbol.iterator]()
		}
		const fromObject = {
			first: metaA,
			second: metaB,
			third: metaC
		}

		expect(toMetas(fromValues)).toEqual([metaA, metaB])
		expect(toMetas(fromEntries)).toEqual([metaA, metaB])
		expect(toMetas(fromObject)).toEqual([metaA, metaB, metaC])
	})

	it('builds entry from local metadata and marks runtime-only sources', () => {
		// Local sourceNodeIndex data should be preferred and runtime-only marker preserved.
		const result = buildReferenceEntry(
			{
				sourceNodeIndex: {
					identifier: '{function:doWork}',
					pathIndex: { identifier: 'src/file.ts' },
					presentInOriginalSourceCode: false
				},
				sensorValues: {
					aggregatedCPUTime: 7,
					aggregatedCPUEnergyConsumption: 11,
					aggregatedRAMEnergyConsumption: 13
				}
			},
			undefined
		)

		expect(result).toEqual({
			name: 'doWork',
			cpuTime: 7,
			cpuEnergy: 11,
			ramEnergy: 13,
			identifier: '{function:doWork}',
			relativePath: 'src/file.ts',
			notPresentInOriginalSourceCode: true
		})
	})

	it('falls back to method name when identifier-based display name is empty', () => {
		const result = buildReferenceEntry(
			{
				methodName: 'fallbackMethodName',
				sourceNodeIndex: {
					identifier: 'invalid-identifier'
				}
			},
			undefined
		)

		expect(result?.name).toBe('fallbackMethodName')
	})

	it('uses project report global index fallback for identifier/path resolution', () => {
		// Missing local index data should be resolved through project global index lookup.
		const result = buildReferenceEntry(
			{
				id: 42,
				sensorValues: {
					selfCPUTime: 3,
					selfCPUEnergyConsumption: 5
				}
			},
			{
				globalIndex: {
					getSourceNodeIndexByID: (id: number) => {
						if (id === 42) {
							return {
								identifier: '{function:globalFallback}',
								pathIndex: { identifier: 'src/global.ts' },
								presentInOriginalSourceCode: true
							}
						}
						return undefined
					}
				}
			}
		)

		expect(result).toEqual({
			name: 'globalFallback',
			cpuTime: 3,
			cpuEnergy: 5,
			ramEnergy: undefined,
			identifier: '{function:globalFallback}',
			relativePath: 'src/global.ts',
			notPresentInOriginalSourceCode: false
		})
	})

	it('validates identifier/path converters safely', () => {
		// Converter helpers reject empty values and keep valid strings unchanged.
		expect(toSourceNodeIdentifier(undefined)).toBeUndefined()
		expect(toSourceNodeIdentifier('')).toBeUndefined()
		expect(toSourceNodeIdentifier('{function:ok}')).toBe('{function:ok}')

		expect(toUnifiedPathString('')).toBeUndefined()
		expect(toUnifiedPathString('src/a.ts')).toBe('src/a.ts')
	})
})
