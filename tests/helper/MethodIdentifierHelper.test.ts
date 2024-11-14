import { SourceNodeIdentifier_string } from '@oaklean/profiler-core/dist/src/types'

import { MethodIdentifierHelper } from '../../src/helper/MethodIdentifierHelper'


describe('MethodIdentifierHelper', () => {
	describe('getShortenedIdentifier', () => {
		it('should return the correct shortened identifier', () => {
			const identifier = '{function:testFunction}' as SourceNodeIdentifier_string
			const result = MethodIdentifierHelper.getShortenedIdentifier(identifier)
			expect(result).toBe('(f)&nbsp;testFunction')
		})

		it('should return null if identifier is not valid', () => {
			const identifier = '{invalid:testFunction}' as SourceNodeIdentifier_string
			const result = MethodIdentifierHelper.getShortenedIdentifier(identifier)
			expect(result).toBe('null&nbsp;null')
		})
	})

	describe('getMethodTypeOfIdentifierPart', () => {
		it('should return the correct method type for function', () => {
			const identifier = '{function:testFunction}' as SourceNodeIdentifier_string
			const result = MethodIdentifierHelper.getMethodTypeOfIdentifierPart(identifier)
			expect(result).toBe('(f)')
		})

		it('should return null if identifier is not valid', () => {
			const identifier = '{invalid:testFunction}' as SourceNodeIdentifier_string
			const result = MethodIdentifierHelper.getMethodTypeOfIdentifierPart(identifier)
			expect(result).toBe(null)
		})
	})

	describe('getMethodNameOfIdentifierPart', () => {
		it('should return the correct method name', () => {
			const identifier = '{function:testFunction}' as SourceNodeIdentifier_string
			const result = MethodIdentifierHelper.getMethodNameOfIdentifierPart(identifier)
			expect(result).toBe('testFunction')
		})

		it('should return null if identifier is not valid', () => {
			const identifier = '{invalid:testFunction}' as SourceNodeIdentifier_string
			const result = MethodIdentifierHelper.getMethodNameOfIdentifierPart(identifier)
			expect(result).toBe(null)
		})
	})
})