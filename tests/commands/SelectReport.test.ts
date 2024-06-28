import '../shared/mocks/vscode.mock'
import '../shared/mocks/QuickPick.mock'
import * as vscode from 'vscode'

import SelectReport from '../../src/commands/SelectReport'
import { Container } from '../../src/container'
import { CommandIdentifiers } from '../../src/commands/SelectReport'
import { stub_getWorkspaceDirStub, stub_globSync, stub_getProjectReportFromWorkspaceStub } from '../shared/mocks/WorkspaceUtils.mock'
import {
	PROJECT_REPORT_PATH_001,
	PROJECT_REPORT_PATH_002,
	PROJECT_REPORT_PATH_003
} from '../shared/constants/profiles'
import ContainerAndStorageMock from '../shared/mocks/ContainerAndStorage.mock'



stub_globSync()
stub_getWorkspaceDirStub()
stub_getProjectReportFromWorkspaceStub()
describe('SelectReport', () => {
	let container: Container
	let command: SelectReport

	beforeEach(() => {
		const containerAndStorageMock = new ContainerAndStorageMock()
		container = containerAndStorageMock.container
		command = new SelectReport(container)
	})

	it('should correctly identify itself', () => {
		expect(command.getIdentifier()).toBe(CommandIdentifiers.selectReport)
	})

	it('should show a QuickPick with report file paths', () => {
		const mockReportFilePaths = [
			{ label: PROJECT_REPORT_PATH_001 },
			{ label: PROJECT_REPORT_PATH_002 },
			{ label: PROJECT_REPORT_PATH_003 },
		]

		const quickPick = vscode.window.createQuickPick()
		quickPick.items = mockReportFilePaths

		command.execute()

		expect(vscode.window.createQuickPick).toHaveBeenCalled()

		expect(quickPick.items.length).toBe(mockReportFilePaths.length)
		expect(quickPick.items).toEqual(expect.arrayContaining(mockReportFilePaths))
		mockReportFilePaths.forEach((path, index) => {
			expect(quickPick.items[index]).toBe(path)
		})
	})
})