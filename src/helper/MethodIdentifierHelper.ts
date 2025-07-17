import {
	ProgramStructureTreeType,
	SourceNodeIdentifierPart_string
} from '@oaklean/profiler-core/dist/src/types'
import {
	LangInternalSourceNodeIdentifierRegex,
	MethodDefinitionRegex,
	ClassDeclarationRegex,
	FunctionDeclarationRegex,
	FunctionExpressionRegex,
	ConstructorDeclarationRegex
} from '@oaklean/profiler-core/dist/src/constants/SourceNodeRegex'
import { SourceNodeIdentifierHelper } from '@oaklean/profiler-core/dist/src/helper/SourceNodeIdentifierHelper'

const allowedMethodTypes = ['function', 'functionExpression', 'method', 'method@static', 'class', 'constructor']


const IDENTIFIER_TYPE_ABBREVIATION: Record<ProgramStructureTreeType, string> = {
	[ProgramStructureTreeType.Root]: '(r)',
	[ProgramStructureTreeType.ClassDeclaration]: '(c)',
	[ProgramStructureTreeType.ClassExpression]: '(c)',
	[ProgramStructureTreeType.FunctionDeclaration]: '(f)',
	[ProgramStructureTreeType.FunctionExpression]: '(f)',
	[ProgramStructureTreeType.ConstructorDeclaration]: '(f)',
	[ProgramStructureTreeType.MethodDefinition]: '(m)',
	[ProgramStructureTreeType.IfStatement]: '(s)',
	[ProgramStructureTreeType.IfThenStatement]: '(s)',
	[ProgramStructureTreeType.IfElseStatement]: '(s)',
	[ProgramStructureTreeType.SwitchStatement]: '(s)',
	[ProgramStructureTreeType.SwitchCaseClause]: '(s)',
	[ProgramStructureTreeType.ObjectLiteralExpression]: '(s)',
}
export class MethodIdentifierHelper {

	static getShortenedIdentifier(identifier: SourceNodeIdentifierPart_string): string {
		const result = SourceNodeIdentifierHelper.parseSourceNodeIdentifierPart(identifier)
		if (result === null) {
			return 'undefined'
		}
		return `${IDENTIFIER_TYPE_ABBREVIATION[result.type]}&nbsp;${result.name}`
	}
}