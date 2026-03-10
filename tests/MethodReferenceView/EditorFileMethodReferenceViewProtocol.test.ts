import { describe, expect, it } from '@jest/globals'

import {
	EditorFileMethodReferenceViewProtocolCommands,
	isEditorFileMethodReferenceViewProtocolChildToParent,
	isEditorFileMethodReferenceViewProtocolParentToChild
} from '../../src/protocols/EditorFileMethodReferenceViewProtocol'
import { OpenSourceLocationProtocolCommands } from '../../src/protocols/OpenSourceLocationProtocol'

describe('EditorFileMethodReferenceViewProtocol guards', () => {
	it('accepts valid child-to-parent commands and rejects invalid payloads', () => {
		expect(
			isEditorFileMethodReferenceViewProtocolChildToParent({
				command: EditorFileMethodReferenceViewProtocolCommands.requestFileName
			})
		).toBe(true)
		expect(
			isEditorFileMethodReferenceViewProtocolChildToParent({
				command: OpenSourceLocationProtocolCommands.openSourceLocation,
				identifier: '{function:test}',
				relativePath: 'src/file.ts'
			})
		).toBe(true)
		expect(
			isEditorFileMethodReferenceViewProtocolChildToParent({
				command: OpenSourceLocationProtocolCommands.openSourceLocation,
				identifier: '{function:test}'
			})
		).toBe(false)
	})

	it('accepts valid parent-to-child updateFileName message', () => {
		expect(
			isEditorFileMethodReferenceViewProtocolParentToChild({
				command: EditorFileMethodReferenceViewProtocolCommands.updateFileName,
				fileName: 'a.ts'
			})
		).toBe(true)
	})

	it('accepts valid parent-to-child updateFirstFunction and rejects broken entries', () => {
		expect(
			isEditorFileMethodReferenceViewProtocolParentToChild({
				command:
					EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction,
				functionName: 'fn',
				intern: [{ name: 'entry', cpuTime: 1 }]
			})
		).toBe(true)
		expect(
			isEditorFileMethodReferenceViewProtocolParentToChild({
				command:
					EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction,
				functionName: 'fn',
				intern: [{ cpuTime: 1 }]
			})
		).toBe(false)
	})
})
