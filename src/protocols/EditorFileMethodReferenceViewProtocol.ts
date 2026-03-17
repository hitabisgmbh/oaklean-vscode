import { z } from 'zod'

import { OpenSourceLocationProtocolCommands } from './OpenSourceLocationProtocol'

export enum EditorFileMethodReferenceViewProtocolCommands {
	closeActiveFile = 'closeActiveFile',
	updateFileName = 'updateFileName',
	requestFileName = 'requestFileName',
	updateFirstFunction = 'updateFirstFunction',
	requestFirstFunction = 'requestFirstFunction'
}

const FunctionEntrySchema = z.object({
	name: z.string(),
	cpuTime: z.number().optional(),
	cpuEnergy: z.number().optional(),
	ramEnergy: z.number().optional(),
	identifier: z.string().optional(),
	relativePath: z.string().optional(),
	isNavigable: z.boolean().optional(),
	notPresentInOriginalSourceCode: z.boolean().optional()
})

const EditorFileMethodReferenceViewProtocol_CloseActiveFileMessageSchema =
	z.object({
		command: z.literal(
			EditorFileMethodReferenceViewProtocolCommands.closeActiveFile
		)
	})

const EditorFileMethodReferenceViewProtocol_RequestFileNameMessageSchema =
	z.object({
		command: z.literal(
			EditorFileMethodReferenceViewProtocolCommands.requestFileName
		)
	})

const EditorFileMethodReferenceViewProtocol_RequestFirstFunctionMessageSchema =
	z.object({
		command: z.literal(
			EditorFileMethodReferenceViewProtocolCommands.requestFirstFunction
		)
	})

const OpenSourceLocationMessageSchema = z.object({
	command: z.literal(OpenSourceLocationProtocolCommands.openSourceLocation),
	identifier: z.string(),
	relativePath: z.string()
})

const EditorFileMethodReferenceViewProtocol_UpdateFileNameMessageSchema =
	z.object({
		command: z.literal(
			EditorFileMethodReferenceViewProtocolCommands.updateFileName
		),
		fileName: z.string()
	})

const EditorFileMethodReferenceViewProtocol_UpdateFirstFunctionMessageSchema =
	z.object({
		command: z.literal(
			EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction
		),
		functionName: z.string(),
		main: FunctionEntrySchema.optional(),
		langInternal: z.array(FunctionEntrySchema).optional(),
		intern: z.array(FunctionEntrySchema).optional(),
		extern: z.array(FunctionEntrySchema).optional(),
		foreignReferences: z.array(FunctionEntrySchema).optional()
	})

const EditorFileMethodReferenceViewProtocol_ChildToParentSchema = z.union([
	EditorFileMethodReferenceViewProtocol_CloseActiveFileMessageSchema,
	EditorFileMethodReferenceViewProtocol_RequestFileNameMessageSchema,
	EditorFileMethodReferenceViewProtocol_RequestFirstFunctionMessageSchema,
	OpenSourceLocationMessageSchema
])

const EditorFileMethodReferenceViewProtocol_ParentToChildSchema = z.union([
	EditorFileMethodReferenceViewProtocol_UpdateFileNameMessageSchema,
	EditorFileMethodReferenceViewProtocol_UpdateFirstFunctionMessageSchema
])

export type FunctionEntry = z.infer<typeof FunctionEntrySchema>

export type EditorFileMethodReferenceViewProtocol_CloseActiveFileMessage =
	z.infer<
		typeof EditorFileMethodReferenceViewProtocol_CloseActiveFileMessageSchema
	>

export type EditorFileMethodReferenceViewProtocol_RequestFileNameMessage =
	z.infer<
		typeof EditorFileMethodReferenceViewProtocol_RequestFileNameMessageSchema
	>

export type EditorFileMethodReferenceViewProtocol_RequestFirstFunctionMessage =
	z.infer<
		typeof EditorFileMethodReferenceViewProtocol_RequestFirstFunctionMessageSchema
	>

export type EditorFileMethodReferenceViewProtocol_UpdateFileNameMessage =
	z.infer<
		typeof EditorFileMethodReferenceViewProtocol_UpdateFileNameMessageSchema
	>

export type EditorFileMethodReferenceViewProtocol_UpdateFirstFunctionMessage =
	z.infer<
		typeof EditorFileMethodReferenceViewProtocol_UpdateFirstFunctionMessageSchema
	>

export type EditorFileMethodReferenceViewProtocol_ChildToParent = z.infer<
	typeof EditorFileMethodReferenceViewProtocol_ChildToParentSchema
>

export type EditorFileMethodReferenceViewProtocol_ParentToChild = z.infer<
	typeof EditorFileMethodReferenceViewProtocol_ParentToChildSchema
>

export function isFunctionEntry(value: unknown): value is FunctionEntry {
	return FunctionEntrySchema.safeParse(value).success
}

export function isEditorFileMethodReferenceViewProtocolChildToParent(
	value: unknown
): value is EditorFileMethodReferenceViewProtocol_ChildToParent {
	return EditorFileMethodReferenceViewProtocol_ChildToParentSchema.safeParse(
		value
	).success
}

export function isEditorFileMethodReferenceViewProtocolParentToChild(
	value: unknown
): value is EditorFileMethodReferenceViewProtocol_ParentToChild {
	return EditorFileMethodReferenceViewProtocol_ParentToChildSchema.safeParse(
		value
	).success
}
