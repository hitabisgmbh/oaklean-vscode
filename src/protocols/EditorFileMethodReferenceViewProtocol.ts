import { OpenSourceLocationProtocol_ChildToParent } from './OpenSourceLocationProtocol'
import { OpenSourceLocationProtocolCommands } from './OpenSourceLocationProtocol'

import { isRecord } from '../helper/typeGuards'

export enum EditorFileMethodReferenceViewProtocolCommands {
	closeActiveFile = 'closeActiveFile',
	updateFileName = 'updateFileName',
	requestFileName = 'requestFileName',
	updateFirstFunction = 'updateFirstFunction',
	requestFirstFunction = 'requestFirstFunction'
}

export type FunctionEntry = {
	name: string
	cpuTime?: number
	cpuEnergy?: number
	ramEnergy?: number
	identifier?: string
	relativePath?: string
	isNavigable?: boolean
	notPresentInOriginalSourceCode?: boolean
}

export type EditorFileMethodReferenceViewProtocol_CloseActiveFileMessage = {
	command: EditorFileMethodReferenceViewProtocolCommands.closeActiveFile
}

export type EditorFileMethodReferenceViewProtocol_RequestFileNameMessage = {
	command: EditorFileMethodReferenceViewProtocolCommands.requestFileName
}

export type EditorFileMethodReferenceViewProtocol_RequestFirstFunctionMessage =
	{
		command: EditorFileMethodReferenceViewProtocolCommands.requestFirstFunction
	}

export type EditorFileMethodReferenceViewProtocol_UpdateFileNameMessage = {
	command: EditorFileMethodReferenceViewProtocolCommands.updateFileName
	fileName: string
}

export type EditorFileMethodReferenceViewProtocol_UpdateFirstFunctionMessage = {
	command: EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction
	functionName: string
	main?: FunctionEntry
	langInternal?: FunctionEntry[]
	intern?: FunctionEntry[]
	extern?: FunctionEntry[]
	foreignReferences?: FunctionEntry[]
}

export type EditorFileMethodReferenceViewProtocol_ChildToParent =
	| EditorFileMethodReferenceViewProtocol_CloseActiveFileMessage
	| EditorFileMethodReferenceViewProtocol_RequestFileNameMessage
	| EditorFileMethodReferenceViewProtocol_RequestFirstFunctionMessage
	| OpenSourceLocationProtocol_ChildToParent

export type EditorFileMethodReferenceViewProtocol_ParentToChild =
	| EditorFileMethodReferenceViewProtocol_UpdateFileNameMessage
	| EditorFileMethodReferenceViewProtocol_UpdateFirstFunctionMessage

function isNumberOrUndefined(value: unknown): value is number | undefined {
	return value === undefined || typeof value === 'number'
}

function isBooleanOrUndefined(value: unknown): value is boolean | undefined {
	return value === undefined || typeof value === 'boolean'
}

function isStringOrUndefined(value: unknown): value is string | undefined {
	return value === undefined || typeof value === 'string'
}

export function isFunctionEntry(value: unknown): value is FunctionEntry {
	if (!isRecord(value)) {
		return false
	}
	return (
		typeof value.name === 'string' &&
		isNumberOrUndefined(value.cpuTime) &&
		isNumberOrUndefined(value.cpuEnergy) &&
		isNumberOrUndefined(value.ramEnergy) &&
		isStringOrUndefined(value.identifier) &&
		isStringOrUndefined(value.relativePath) &&
		isBooleanOrUndefined(value.isNavigable) &&
		isBooleanOrUndefined(value.notPresentInOriginalSourceCode)
	)
}

function isFunctionEntryArray(value: unknown): value is FunctionEntry[] {
	return Array.isArray(value) && value.every(isFunctionEntry)
}

type ChildToParentCommand =
	EditorFileMethodReferenceViewProtocol_ChildToParent['command']
type ParentToChildCommand =
	EditorFileMethodReferenceViewProtocol_ParentToChild['command']

type ChildToParentMessageByCommand = {
	[K in ChildToParentCommand]: Extract<
		EditorFileMethodReferenceViewProtocol_ChildToParent,
		{ command: K }
	>
}

type ParentToChildMessageByCommand = {
	[K in ParentToChildCommand]: Extract<
		EditorFileMethodReferenceViewProtocol_ParentToChild,
		{ command: K }
	>
}

type MessageValidator<T extends Record<string, unknown>> = (
	value: Record<string, unknown>
) => value is T

const isCloseActiveFileMessage: MessageValidator<
	EditorFileMethodReferenceViewProtocol_CloseActiveFileMessage
> = (
	value: Record<string, unknown>
): value is EditorFileMethodReferenceViewProtocol_CloseActiveFileMessage => true

const isRequestFileNameMessage: MessageValidator<
	EditorFileMethodReferenceViewProtocol_RequestFileNameMessage
> = (
	value: Record<string, unknown>
): value is EditorFileMethodReferenceViewProtocol_RequestFileNameMessage => true

const isRequestFirstFunctionMessage: MessageValidator<
	EditorFileMethodReferenceViewProtocol_RequestFirstFunctionMessage
> = (
	value: Record<string, unknown>
): value is EditorFileMethodReferenceViewProtocol_RequestFirstFunctionMessage =>
	true

const isOpenSourceLocationMessage: MessageValidator<
	ChildToParentMessageByCommand[OpenSourceLocationProtocolCommands.openSourceLocation]
> = (
	value
): value is ChildToParentMessageByCommand[OpenSourceLocationProtocolCommands.openSourceLocation] =>
	typeof value.identifier === 'string' && typeof value.relativePath === 'string'

const isUpdateFileNameMessage: MessageValidator<
	EditorFileMethodReferenceViewProtocol_UpdateFileNameMessage
> = (
	value
): value is EditorFileMethodReferenceViewProtocol_UpdateFileNameMessage =>
	typeof value.fileName === 'string'

const isUpdateFirstFunctionMessage: MessageValidator<
	EditorFileMethodReferenceViewProtocol_UpdateFirstFunctionMessage
> = (
	value
): value is EditorFileMethodReferenceViewProtocol_UpdateFirstFunctionMessage =>
	typeof value.functionName === 'string' &&
	(value.main === undefined || isFunctionEntry(value.main)) &&
	(value.langInternal === undefined ||
		isFunctionEntryArray(value.langInternal)) &&
	(value.intern === undefined || isFunctionEntryArray(value.intern)) &&
	(value.extern === undefined || isFunctionEntryArray(value.extern)) &&
	(value.foreignReferences === undefined ||
		isFunctionEntryArray(value.foreignReferences))

const childToParentValidators: {
	[K in ChildToParentCommand]: MessageValidator<
		ChildToParentMessageByCommand[K]
	>
} = {
	[EditorFileMethodReferenceViewProtocolCommands.closeActiveFile]:
		isCloseActiveFileMessage,
	[EditorFileMethodReferenceViewProtocolCommands.requestFileName]:
		isRequestFileNameMessage,
	[EditorFileMethodReferenceViewProtocolCommands.requestFirstFunction]:
		isRequestFirstFunctionMessage,
	[OpenSourceLocationProtocolCommands.openSourceLocation]:
		isOpenSourceLocationMessage
}

const parentToChildValidators: {
	[K in ParentToChildCommand]: MessageValidator<
		ParentToChildMessageByCommand[K]
	>
} = {
	[EditorFileMethodReferenceViewProtocolCommands.updateFileName]:
		isUpdateFileNameMessage,
	[EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction]:
		isUpdateFirstFunctionMessage
}

function hasValidatorForCommand<T extends Record<string, unknown>>(
	validators: T,
	command: string
): command is Extract<keyof T, string> {
	return Object.prototype.hasOwnProperty.call(validators, command)
}

export function isEditorFileMethodReferenceViewProtocolChildToParent(
	value: unknown
): value is EditorFileMethodReferenceViewProtocol_ChildToParent {
	if (!isRecord(value) || typeof value.command !== 'string') {
		return false
	}
	if (!hasValidatorForCommand(childToParentValidators, value.command)) {
		return false
	}
	return childToParentValidators[value.command](value)
}

export function isEditorFileMethodReferenceViewProtocolParentToChild(
	value: unknown
): value is EditorFileMethodReferenceViewProtocol_ParentToChild {
	if (!isRecord(value) || typeof value.command !== 'string') {
		return false
	}
	if (!hasValidatorForCommand(parentToChildValidators, value.command)) {
		return false
	}
	return parentToChildValidators[value.command](value)
}
