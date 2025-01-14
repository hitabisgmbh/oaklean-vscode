import '../shared/mocks/vscode.mock'
import '../shared/mocks/profiler-core.mock'

import { Container } from '../../src/container'
import EventHandler from '../../src/helper/EventHandler'
import { SourceFileMetaDataTreeProvider } from '../../src/treeviews/SourceFileMetaDataTreeProvider'
import { stub_createDirectoryTree } from '../shared/mocks/SourceFileMetaDataProvider.mock'
import ContainerAndStorageMock from '../shared/mocks/ContainerAndStorage.mock'


stub_createDirectoryTree()
let container: Container
let treeDataProvider: SourceFileMetaDataTreeProvider
let eventHandler: EventHandler
beforeEach(() => {
	const containerAndStorageMock = new ContainerAndStorageMock()
	container = containerAndStorageMock.container
	eventHandler = new EventHandler(container)
	treeDataProvider = new SourceFileMetaDataTreeProvider(container)
	treeDataProvider.includedFilterPath = undefined
	treeDataProvider.excludedFilterPath = undefined
})


describe('FilterCommand', () => {
	test('filter calls changes SourceFileMetaDataTreeProvider include path', () => {
		const command = 'included-path-change'
		const text = '/included/filter/path'
		const fireFilterPathChangeEventSpy = jest.spyOn(eventHandler, 'fireFilterPathChange')

		treeDataProvider.filter(command, text)
		expect(treeDataProvider.includedFilterPath).toEqual(text)
		expect(fireFilterPathChangeEventSpy).toHaveBeenCalledWith(
			{ includedFilterPath: text, excludedFilterPath: undefined })
	})
})