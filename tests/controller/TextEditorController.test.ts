import '../shared/mocks/vscode.mock'
import { TextEditor } from 'vscode'
import { UnifiedPath } from '@oaklean/profiler-core'

import { Container } from '../../src/container'
import TextEditorController from '../../src/controller/TextEditorController'
import { stub_getWorkspaceDirStub } from '../shared/mocks/WorkspaceUtils.mock'
import ContainerAndStorageMock from '../shared/mocks/ContainerAndStorage.mock'


stub_getWorkspaceDirStub()

describe('TextEditorController', () => {
	let container: Container
	let textEditorController: TextEditorController
	let mockEditor: TextEditor
	let mockEvent: any

	beforeEach(() => {
		const containerAndStorageMock = new ContainerAndStorageMock()
		container = containerAndStorageMock.container
		textEditorController = new TextEditorController(container)
		mockEditor = {
			document: {
				fileName: '/path/to/workspace/file.ts',
				uri: { scheme: 'file' }
			},
			setDecorations: jest.fn()
		} as unknown as TextEditor
		mockEvent = {
			enabled: true,
			sensorValueRepresentation: { selectedSensorValueType: 'profilerHits', formula: 'profilerHits * 2' },
			editor: mockEditor,
			fileName: '/path/to/workspace/file.ts'
		}
	})

	it('should refresh on reportLoaded event', () => {
		const refreshSpy = jest.spyOn(textEditorController, 'refresh')
		textEditorController.reportLoaded({
			type: 'ProjectReport'
		})
		expect(refreshSpy).toHaveBeenCalled()
	})

	it('should set editor on textEditorChanged event and refresh', () => {
		const refreshSpy = jest.spyOn(textEditorController, 'refresh')
		textEditorController.textEditorChanged({ editor: mockEditor })
		expect(textEditorController.editor).toBe(mockEditor)
		expect(refreshSpy).toHaveBeenCalled()
	})


	it('should refresh if the sourceFileInformationChange event file matches the editor file', () => {
		textEditorController.setEditor(mockEditor)
		const refreshSpy = jest.spyOn(textEditorController, 'refresh')
		const path = new UnifiedPath('/path/to/workspace/file.ts')
		textEditorController.sourceFileInformationChanged({ absolutePath: path })
		expect(refreshSpy).toHaveBeenCalled()
	})

	it('should not refresh if the sourceFileInformationChange event file does not match the editor file', () => {
		textEditorController.setEditor(mockEditor)
		const refreshSpy = jest.spyOn(textEditorController, 'refresh')
		const path = new UnifiedPath('/path/to/workspace/other-file.ts')
		textEditorController.sourceFileInformationChanged({ absolutePath: path })
		expect(refreshSpy).not.toHaveBeenCalled()
	})
})