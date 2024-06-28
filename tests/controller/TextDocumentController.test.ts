import '../shared/mocks/vscode.mock'
import vscode from 'vscode'
import { UnifiedPath } from '@oaklean/profiler-core'

import TextDocumentController from '../../src/controller/TextDocumentController'
import { Container } from '../../src/container'
import { stub_getWorkspaceDirStub } from '../shared/mocks/WorkspaceUtils.mock'
import ContainerAndStorageMock from '../shared/mocks/ContainerAndStorage.mock'

describe('TextDocumentController', () => {
	let container: Container
	let textDocumentController: TextDocumentController
	let mockEvent: any
	let mockEditor: vscode.TextEditor

	beforeEach(() => {
		const containerAndStorageMock = new ContainerAndStorageMock()
		container = containerAndStorageMock.container
		textDocumentController = new TextDocumentController(container)
		mockEvent = {
			enabled: true,
			sensorValueRepresentation: { selectedSensorValueType: 'profilerHits', formula: 'profilerHits * 2' },
			editor: mockEditor,
			fileName: '/path/to/workspace/file.ts'
		}
	})
	stub_getWorkspaceDirStub()
	it('should handle reportPathChanged event correctly', () => {
		const reportPathChangeEvent = { reportPath: new UnifiedPath('/path/to/report') }
		textDocumentController.reportPathChanged(reportPathChangeEvent)
		expect(textDocumentController.reportPath).toEqual(reportPathChangeEvent.reportPath)
		expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
			expect.stringContaining(reportPathChangeEvent.reportPath.basename()))
	})

	it('should handle documentOpened event correctly by setting program structure tree', () => {
		const mockDocument = { fileName: '/path/to/workspace/file.ts', getText: () => 'const a = 1' } as unknown as vscode.TextDocument
		const textDocumentOpenEvent = { document: mockDocument }
		textDocumentController.documentOpened(textDocumentOpenEvent)
		expect(Object.keys(textDocumentController.programStructureTreePerDocument)).toContain('./file.ts')
	})

	it('should handle documentClosed event correctly by unsetting program structure tree', () => {
		const mockDocument = { fileName: '/path/to/workspace/file.ts', getText: () => 'const a = 1' } as unknown as vscode.TextDocument
		const textDocumentOpenEvent = { document: mockDocument }
		textDocumentController.documentOpened(textDocumentOpenEvent)
		const textDocumentCloseEvent = { document: mockDocument }
		textDocumentController.documentClosed(textDocumentCloseEvent)
		expect(Object.keys(textDocumentController.programStructureTreePerDocument)).not.toContain('./file.ts')
	})

})