import '../shared/mocks/vscode.mock'
import * as vscode from 'vscode'
import { UnifiedPath } from '@oaklean/profiler-core'

import SelectReport, { CommandIdentifiers } from '../../src/commands/SelectReportFromContextMenu'
import { Container } from '../../src/container'
import EventHandler from '../../src/helper/EventHandler'
import * as getPlatform from '../../src/utilities/getPlatform'
import { stub_getWorkspaceDirStub, stub_globSync } from '../shared/mocks/WorkspaceUtils.mock'
import ContainerAndStorageMock from '../shared/mocks/ContainerAndStorage.mock'

stub_globSync()
stub_getWorkspaceDirStub()

describe('SelectReport', () => {
	let selectReport: SelectReport
	let container: Container
	let eventHandler: EventHandler
	beforeEach(() => {
		const containerAndStorageMock = new ContainerAndStorageMock()
		container = containerAndStorageMock.container
		eventHandler = new EventHandler(container)
		selectReport = new SelectReport(container)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	test('getIdentifier returns the correct identifier', () => {
		expect(selectReport.getIdentifier()).toBe(CommandIdentifiers.selectReportFromContextMenu)
	})

	test('execute stores report path on Windows with leading slash', async () => {
		jest.spyOn(getPlatform, 'isWindows').mockReturnValue(true)
		const fireReportPathChangeEventSpy = jest.spyOn(eventHandler, 'fireReportPathChange')
		const uri = vscode.Uri.file('/c:/path/to/report')
		await selectReport.execute(uri)
		const file = uri.path.slice(1)
		const reportPath = new UnifiedPath(file)
		expect(container.storage.storeWorkspace).toHaveBeenCalledWith('reportPath', reportPath)
		expect(fireReportPathChangeEventSpy).toHaveBeenCalledWith(reportPath)
	})

	test('execute stores report path on non-Windows without modifying path', async () => {
		jest.spyOn(getPlatform, 'isWindows').mockReturnValue(false)
		const fireReportPathChangeEventSpy = jest.spyOn(eventHandler, 'fireReportPathChange')
		const uri = vscode.Uri.file('/path/to/report')

		await selectReport.execute(uri)
		const file = uri.path
		const reportPath = new UnifiedPath(file)
		expect(container.storage.storeWorkspace).toHaveBeenCalledWith('reportPath', reportPath)
		expect(fireReportPathChangeEventSpy).toHaveBeenCalledWith(reportPath)
	})
})