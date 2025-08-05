import { SourceNodeIdentifierPart_string } from '@oaklean/profiler-core/dist/src/types'

import { MethodIdentifierHelper } from '../../src/helper/MethodIdentifierHelper'


describe('MethodIdentifierHelper', () => {
	describe('getShortenedIdentifier', () => {
		it('should return the correct shortened identifier', () => {
			const identifier = '{function:testFunction}' as SourceNodeIdentifierPart_string
			const result = MethodIdentifierHelper.getShortenedIdentifier(identifier)
			expect(result).toBe('(f) testFunction')
		})

		it('should return null if identifier is not valid', () => {
			const identifier = '{invalid:testFunction}' as SourceNodeIdentifierPart_string
			const result = MethodIdentifierHelper.getShortenedIdentifier(identifier)
			expect(result).toBe('undefined')
		})
	})
})