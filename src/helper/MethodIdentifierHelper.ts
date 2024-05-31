import {
	SourceNodeIdentifier_string
} from '@oaklean/profiler-core/dist/src/types/SourceNodeIdentifiers.types'
import {
	MethodDefinitionRegex,
	ClassDeclarationRegex,
	FunctionDeclarationRegex,
	FunctionExpressionRegex,
	ConstructorDeclarationRegex
} from '@oaklean/profiler-core/dist/src/constants/SourceNodeRegex'

const allowedMethodTypes = ['function', 'functionExpression', 'method', 'class', 'constructor']


const identifierTypeAbbreviation = {
	'class': '(c)',
	'function': '(f)',
	'functionExpression': '(f)',
	'constructor': '(f)',
	'method': '(m)'
}
export class MethodIdentifierHelper {

	static getShortenedIdentifier(identifier: SourceNodeIdentifier_string): string {
		const type = this.getMethodTypeOfIdentifierPart(identifier)
		const name = this.getMethodNameOfIdentifierPart(identifier)
		return `${type}&nbsp;${name}`
	}

	static getMethodTypeOfIdentifierPart(identifier: SourceNodeIdentifier_string): string | null {
		if (new RegExp(MethodDefinitionRegex).test(identifier)) {
			return identifierTypeAbbreviation['method']
		} else if (new RegExp(FunctionDeclarationRegex).test(identifier)) {
			return identifierTypeAbbreviation['function']
		} else if (new RegExp(ClassDeclarationRegex).test(identifier)) {
			return identifierTypeAbbreviation['class']
		} else if (new RegExp(FunctionExpressionRegex).test(identifier)) {
			return identifierTypeAbbreviation['functionExpression']
		} else if (new RegExp(ConstructorDeclarationRegex).test(identifier)){
			return identifierTypeAbbreviation['constructor']
		} else { 
			return null
		}
	}
	
	static getMethodNameOfIdentifierPart(identifier: SourceNodeIdentifier_string): string | null {
		const regex = new RegExp(`{(${allowedMethodTypes.join('|')}):([^}]*)}`)
		const match = identifier.match(regex)
		if (match) {
			const name = match[2]
			return name
		}
	
		return null
	}
}