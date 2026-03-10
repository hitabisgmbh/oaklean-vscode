import vscode, { Disposable, TextEditor } from 'vscode'
import { UnifiedPath } from '@oaklean/profiler-core'

import { Container } from '../container'
import WorkspaceUtils from '../helper/WorkspaceUtils'

// Type representing a source code location with line and column numbers.
type SourceLocation = {
	line: number
	column: number
}

// Type representing the scope information derived from the selected identifier.
type ScopeInformation = {
	functionName: string
	className?: string
	namespace?: string
}

const IDENTIFIER_PART_TYPE_FUNCTION = 'function'
const IDENTIFIER_PART_TYPE_METHOD = 'method'
const IDENTIFIER_PART_TYPE_CONSTRUCTOR = 'constructor'
const IDENTIFIER_PART_TYPE_GET = 'get'
const IDENTIFIER_PART_TYPE_SET = 'set'
const IDENTIFIER_PART_TYPE_CLASS = 'class'
const IDENTIFIER_PART_TYPE_MODULE = 'module'
const IDENTIFIER_PART_TYPE_NAMESPACE = 'namespace'

function parseIdentifierPart(
	part: string
): { type: string; name: string } | undefined {
	const match = part.match(/^\{([^:}]+):(.+)\}$/)
	if (match === null) {
		return undefined
	}
	return {
		type: match[1],
		name: match[2]
	}
}

// Type representing the result of looking up an identifier in the Program Structure Tree (PST).
type PstLookupResult = {
	identifier: string
}

// Interface representing the expected structure of the Program Structure Tree (PST) used in this controller.
type ProgramStructureTreeLike = {
	identifierNodeBySourceLocation: (
		loc: SourceLocation
	) => PstLookupResult | undefined
}

type SensorValuesLike = {
	profilerHits?: number
	aggregatedCPUTime?: number
	selfCPUTime?: number
	internCPUTime?: number
	externCPUTime?: number
	langInternalCPUTime?: number
	aggregatedCPUEnergyConsumption?: number
	selfCPUEnergyConsumption?: number
	internCPUEnergyConsumption?: number
	externCPUEnergyConsumption?: number
	langInternalCPUEnergyConsumption?: number
	aggregatedRAMEnergyConsumption?: number
	selfRAMEnergyConsumption?: number
	internRAMEnergyConsumption?: number
	externRAMEnergyConsumption?: number
	langInternalRAMEnergyConsumption?: number
	customFormula?: number
}

type SourceNodeMetaDataLike = {
	sourceNodeIndex?: { identifier?: string }
	sensorValues?: SensorValuesLike
}

type SourceFileMetaDataLike = {
	functions?: {
		values: () => Iterator<unknown>
	}
}

// Type guard to check if a value is a Record<string, unknown>
function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object'
}

// Type guard to check if a value is ProgramStructureTreeLike
function isProgramStructureTreeLike(
	value: unknown
): value is ProgramStructureTreeLike {
	if (!isRecord(value)) {
		return false
	}
	return typeof value.identifierNodeBySourceLocation === 'function'
}

function isSourceNodeMetaDataLike(
	value: unknown
): value is SourceNodeMetaDataLike {
	return isRecord(value)
}

function isSourceFileMetaDataLike(
	value: unknown
): value is SourceFileMetaDataLike {
	if (!isRecord(value)) {
		return false
	}
	const functions = value.functions
	if (!isRecord(functions)) {
		return false
	}
	return typeof functions.values === 'function'
}

function hasMeasurements(sensorValues: SensorValuesLike | undefined): boolean {
	if (sensorValues === undefined) {
		return false
	}
	for (const value of Object.values(sensorValues)) {
		if (typeof value === 'number' && Number.isFinite(value)) {
			return true
		}
	}
	return false
}

function isValidSourceNodeIdentifier(identifier: string): boolean {
	const parts = identifier.split('.')
	if (parts.length === 0) {
		return false
	}
	for (const part of parts) {
		if (part === '{root}') {
			continue
		}
		if (parseIdentifierPart(part) === undefined) {
			return false
		}
	}
	return true
}

export default class ScopeChangeController implements Disposable {
	private readonly _disposable: Disposable
	private readonly container: Container
	private _activeEditor: TextEditor | undefined

	private _lastScopeCache: {
		file?: string
		selectedIdentifier?: string
		selectedIdentifierFirstParentWithMeasurements?: string
		functionName?: string
		className?: string
		namespace?: string
	} = {}

	constructor(container: Container) {
		this.container = container
		this._disposable = Disposable.from(
			this.container.eventHandler.onTextEditorChange(
				this.onTextEditorChange.bind(this)
			),
			this.container.eventHandler.onSourceFileInformationChange(
				this.onSourceFileInformationChange.bind(this)
			),
			this.container.eventHandler.onReportLoaded(this.refresh.bind(this)),
			vscode.window.onDidChangeTextEditorSelection(
				this.onSelectionChange.bind(this)
			)
		)
		this._activeEditor = vscode.window.activeTextEditor
	}

	public dispose(): void {
		this._disposable.dispose()
	}

	private onTextEditorChange(event: { editor: TextEditor }): void {
		this._activeEditor = event.editor
		this.refresh()
	}

	private onSourceFileInformationChange(event: {
		absolutePath: UnifiedPath
	}): void {
		if (
			this._activeEditor !== undefined &&
			this._activeEditor.document.fileName === event.absolutePath.toString()
		) {
			this.refresh()
		}
	}

	private onSelectionChange(
		event: vscode.TextEditorSelectionChangeEvent
	): void {
		if (event.textEditor !== this._activeEditor) {
			return
		}
		this.refresh()
	}

	private refresh(): void {
		if (this._activeEditor === undefined) {
			return
		}
		this.refreshScopeFromCursor(
			this._activeEditor,
			this._activeEditor.selection.active
		)
	}

	private refreshScopeFromCursor(
		editor: TextEditor,
		position: vscode.Position
	): void {
		const document = editor.document
		const relativeWorkspacePath = WorkspaceUtils.getRelativeWorkspacePath(
			document.fileName
		)

		if (relativeWorkspacePath === undefined) {
			return
		}

		const selectedIdentifier = this.resolveSelectedIdentifier(
			relativeWorkspacePath,
			position
		)
		const selectedIdentifierFirstParentWithMeasurements =
			this.resolveSelectedIdentifierFirstParentWithMeasurements(
				relativeWorkspacePath,
				selectedIdentifier
			)
		const scopeInformation = this.resolveScopeInformation(selectedIdentifier)

		if (
			this._lastScopeCache.file === relativeWorkspacePath.toString() &&
			this._lastScopeCache.selectedIdentifier === selectedIdentifier &&
			this._lastScopeCache.selectedIdentifierFirstParentWithMeasurements ===
				selectedIdentifierFirstParentWithMeasurements &&
			this._lastScopeCache.functionName === scopeInformation.functionName &&
			this._lastScopeCache.className === scopeInformation.className &&
			this._lastScopeCache.namespace === scopeInformation.namespace
		) {
			return
		}

		this._lastScopeCache = {
			file: relativeWorkspacePath.toString(),
			selectedIdentifier,
			selectedIdentifierFirstParentWithMeasurements,
			functionName: scopeInformation.functionName,
			className: scopeInformation.className,
			namespace: scopeInformation.namespace
		}

		this.container.eventHandler.fireScopeChange({
			scopeInformation,
			relativeWorkspacePath: relativeWorkspacePath,
			selectedIdentifier,
			selectedIdentifierFirstParentWithMeasurements
		})
	}

	private resolveSelectedIdentifier(
		relativeWorkspacePath: UnifiedPath,
		position: vscode.Position
	): string | undefined {
		const pstCandidate =
			this.container.textDocumentController.getProgramStructureTreeOfFile(
				relativeWorkspacePath
			)
		if (!isProgramStructureTreeLike(pstCandidate)) {
			return undefined
		}

		// PST lookup like in PST viewer:
		// VS Code position is 0-based; convert to parser location format.
		const sourceLocation: SourceLocation = {
			line: position.line + 1,
			column: position.character
		}
		const result = pstCandidate.identifierNodeBySourceLocation(sourceLocation)
		if (result === undefined) {
			console.debug('ScopeChangeController: no PST node at cursor', {
				file: relativeWorkspacePath.toString(),
				line: sourceLocation.line,
				column: sourceLocation.column
			})
			return undefined
		}
		console.debug('ScopeChangeController: PST identifier', {
			file: relativeWorkspacePath.toString(),
			identifier: result.identifier
		})
		if (!isValidSourceNodeIdentifier(result.identifier)) {
			console.debug('ScopeChangeController: invalid identifier format', {
				file: relativeWorkspacePath.toString(),
				identifier: result.identifier
			})
			return undefined
		}
		return result.identifier
	}

	private resolveSelectedIdentifierFirstParentWithMeasurements(
		relativeWorkspacePath: UnifiedPath,
		selectedIdentifier: string | undefined
	): string | undefined {
		if (selectedIdentifier === undefined) {
			return undefined
		}
		const sourceFileInformation =
			this.container.textDocumentController.getSourceFileInformationOfFile(
				relativeWorkspacePath
			)
		if (sourceFileInformation === undefined) {
			return undefined
		}
		const sourceFileMetaData = sourceFileInformation.sourceFileMetaData
		if (!isSourceFileMetaDataLike(sourceFileMetaData)) {
			return undefined
		}

		const measuredIdentifiers = new Set<string>()
		for (const candidate of sourceFileMetaData.functions.values()) {
			if (!isSourceNodeMetaDataLike(candidate)) {
				continue
			}
			const identifier = candidate.sourceNodeIndex?.identifier
			if (identifier === undefined) {
				continue
			}
			if (!hasMeasurements(candidate.sensorValues)) {
				continue
			}
			measuredIdentifiers.add(identifier)
		}

		// Include the current scope itself first, then walk up to parents.
		// This is required when the selected scope already has measurements.
		let currentParts = selectedIdentifier.split('.')
		while (currentParts.length > 0) {
			const currentIdentifier = currentParts.join('.')
			if (measuredIdentifiers.has(currentIdentifier)) {
				console.debug(
					'ScopeChangeController: matched parent with measurements',
					{
						file: relativeWorkspacePath.toString(),
						identifier: currentIdentifier
					}
				)
				return currentIdentifier
			}
			currentParts = currentParts.slice(0, currentParts.length - 1)
		}
		console.debug('ScopeChangeController: no parent with measurements', {
			file: relativeWorkspacePath.toString(),
			identifier: selectedIdentifier
		})
		return undefined
	}

	private resolveScopeInformation(
		selectedIdentifier: string | undefined
	): ScopeInformation {
		if (selectedIdentifier === undefined) {
			return {
				functionName: ''
			}
		}

		const parts = selectedIdentifier.split('.')
		let functionName = ''
		let className: string | undefined
		let namespace: string | undefined

		for (const part of parts) {
			const parsed = parseIdentifierPart(part)
			if (parsed === undefined) {
				continue
			}
			const parsedType = parsed.type.toLowerCase()
			if (
				parsedType.includes(IDENTIFIER_PART_TYPE_FUNCTION) ||
				parsedType.includes(IDENTIFIER_PART_TYPE_METHOD) ||
				parsedType.includes(IDENTIFIER_PART_TYPE_CONSTRUCTOR) ||
				parsedType.includes(IDENTIFIER_PART_TYPE_GET) ||
				parsedType.includes(IDENTIFIER_PART_TYPE_SET)
			) {
				functionName = parsed.name
			}
			if (parsedType.includes(IDENTIFIER_PART_TYPE_CLASS)) {
				className = parsed.name
			}
			if (
				parsedType.includes(IDENTIFIER_PART_TYPE_MODULE) ||
				parsedType.includes(IDENTIFIER_PART_TYPE_NAMESPACE)
			) {
				namespace = parsed.name
			}
		}

		return {
			functionName,
			className,
			namespace
		}
	}
}
