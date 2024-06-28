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
				fileName: '/path/to/workspace/file.ts'
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

	it('should handle toggleLineAnnotationsChange event correctly', () => {
		const refreshSpy = jest.spyOn(textEditorController, 'refresh')
		textEditorController.toggleLineAnnotationsChange({ enabled: false })
		expect(textEditorController['_enableLineAnnotations']).toBe(false)
		expect(refreshSpy).toHaveBeenCalled()
	})

	it('should handle selectedSensorValueTypeChanged event correctly', () => {
		const refreshSpy = jest.spyOn(textEditorController, 'refresh')
		textEditorController.selectedSensorValueTypeChanged(
			{ sensorValueRepresentation: mockEvent.sensorValueRepresentation })
		expect(textEditorController['_sensorValueRepresentation']).toEqual(mockEvent.sensorValueRepresentation)
		expect(refreshSpy).toHaveBeenCalled()
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


	it('should refresh if the programStructureTreeChanged event file matches the editor file', () => {
		textEditorController.setEditor(mockEditor)
		const refreshSpy = jest.spyOn(textEditorController, 'refresh')
		const path = new UnifiedPath('./file.ts')
		textEditorController.programStructureTreeChanged({ fileName: path })
		expect(refreshSpy).toHaveBeenCalled()
	})

	it('should not refresh if the programStructureTreeChanged event file does not match the editor file', () => {
		textEditorController.setEditor(mockEditor)
		const refreshSpy = jest.spyOn(textEditorController, 'refresh')
		const path = new UnifiedPath('./other-file.ts')
		textEditorController.programStructureTreeChanged({ fileName: path })
		expect(refreshSpy).not.toHaveBeenCalled()
	})

	it('should dispose all resources on dispose', () => {
		const disposeTextDecorationsSpy = jest.spyOn(textEditorController, 'disposeTextDecorations')
		const disposeSensorValueHoverProviderSpy = jest.spyOn(textEditorController, 'disposeSensorValueHoverProvider')
		textEditorController.dispose()
		expect(disposeTextDecorationsSpy).toHaveBeenCalled()
		expect(disposeSensorValueHoverProviderSpy).toHaveBeenCalled()
	})
})