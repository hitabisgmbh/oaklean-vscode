import '../shared/mocks/vscode.mock'
import * as vscode from 'vscode'

import SelectReport from '../../src/commands/SelectReport'
import { Container } from '../../src/container'
import { CommandIdentifiers } from '../../src/commands/SelectReport'
import { stub_getWorkspaceDirStub, stub_globSync, stub_getProjectReportFromWorkspaceStub } from '../shared/mocks/WorkspaceUtils.mock'
import {
	PROJECT_REPORT_PATH_001,
} from '../shared/constants/profiles'
import ContainerAndStorageMock from '../shared/mocks/ContainerAndStorage.mock'
import WorkspaceUtils from '../../src/helper/WorkspaceUtils'

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

	it('should show a QuickPick with report file paths', async () => {
		const quickPick = command.execute()
		const selectedOption = quickPick.optionsWithCallBacks.get(PROJECT_REPORT_PATH_001)
		selectedOption?.selectionCallback()

		expect(container.storage.storeWorkspace).toBeCalled()
	})

	it('should show a message when no reports are available', async () => {
		const getWorkspaceDirStub = jest.spyOn(WorkspaceUtils, 'getProjectReportFromWorkspace')
		getWorkspaceDirStub.mockReturnValue([])
		command.execute()
		expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Oaklean: No Project Reports Available')
	})
})