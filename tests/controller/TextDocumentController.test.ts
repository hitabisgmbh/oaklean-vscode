import '../shared/mocks/vscode.mock'
import vscode from 'vscode'
import { ProjectReport, UnifiedPath } from '@oaklean/profiler-core'

import TextDocumentController from '../../src/controller/TextDocumentController'
import { Container } from '../../src/container'
import { stub_getWorkspaceDirStub } from '../shared/mocks/WorkspaceUtils.mock'
import ContainerAndStorageMock from '../shared/mocks/ContainerAndStorage.mock'
import { stub_ProfilerConfig } from '../shared/mocks/ProfilerConfig.mock'
import { SourceFileInformation } from '../../src/model/SourceFileInformation'
import { ProjectReportHelper } from '../../src/helper/ProjectReportHelper'

describe('TextDocumentController', () => {
	let container: Container
	let textDocumentController: TextDocumentController

	beforeEach(() => {
		const containerAndStorageMock = new ContainerAndStorageMock()
		container = containerAndStorageMock.container
		textDocumentController = new TextDocumentController(container)
	})
	stub_ProfilerConfig()
	stub_getWorkspaceDirStub()

	describe('reportPathChanged event', () => {
		it('should handle non existing report correctly', () => {
			const loadReportSpy = jest.spyOn(ProjectReportHelper, 'loadReport').mockReturnValue(
				undefined as unknown as ProjectReport
			)

			const reportPathChangeEvent = { reportPath: new UnifiedPath('/path/to/non/existend/report') }
			textDocumentController.reportPathChanged(reportPathChangeEvent)
			expect(textDocumentController.reportPath).toEqual(reportPathChangeEvent.reportPath)
			expect(textDocumentController.projectReport).not.toBeDefined()
			loadReportSpy.mockReset()
		})

			it('should handle existing report correctly', () => {
				const loadReportSpy = jest.spyOn(ProjectReportHelper, 'loadReport').mockReturnValue(
					{} as unknown as ProjectReport
				)

				const reportPathChangeEvent = { reportPath: new UnifiedPath('/path/to/report') }
				textDocumentController.reportPathChanged(reportPathChangeEvent)
				expect(textDocumentController.reportPath).toEqual(reportPathChangeEvent.reportPath)
				expect(textDocumentController.projectReport).toBeDefined()
				expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
					expect.stringContaining(reportPathChangeEvent.reportPath.basename())
				)
				loadReportSpy.mockReset()
			})
	})

	it('should handle documentOpened event correctly', () => {
		const fireSourceFileInformationChangeEventSpy = jest.spyOn(container.eventHandler, 'fireSourceFileInformationChange')

		jest.spyOn(textDocumentController, 'projectReport', 'get').mockReturnValue({} as ProjectReport)
		jest.spyOn(textDocumentController, 'reportPath', 'get').mockReturnValue(new UnifiedPath('/path/to/report'))
		const absoluteFilePath = new UnifiedPath('/path/to/workspace/file.ts')
		jest.spyOn(SourceFileInformation, 'fromDocument').mockReturnValue({
			absoluteFilePath: absoluteFilePath,
			relativeWorkspacePath: new UnifiedPath('./file.ts'),
		} as unknown as SourceFileInformation)

		const mockDocument = { fileName: '/path/to/workspace/file.ts', getText: () => 'const a = 1' } as unknown as vscode.TextDocument
		const textDocumentOpenEvent = { document: mockDocument }
		textDocumentController.documentOpened(textDocumentOpenEvent)
		expect(textDocumentController.sourceFileInformationPerDocument.keys()).toContain('./file.ts')

		expect(fireSourceFileInformationChangeEventSpy).toHaveBeenCalledWith(absoluteFilePath)
	})

	it('should handle documentClosed event correctly', () => {
		const mockDocument = { fileName: '/path/to/workspace/file.ts', getText: () => 'const a = 1' } as unknown as vscode.TextDocument
		const textDocumentOpenEvent = { document: mockDocument }
		textDocumentController.documentOpened(textDocumentOpenEvent)
		const textDocumentCloseEvent = { document: mockDocument }
		textDocumentController.documentClosed(textDocumentCloseEvent)
		expect(textDocumentController.sourceFileInformationPerDocument.keys()).not.toContain('./file.ts')
	})
})