import '../shared/mocks/vscode.mock'
import '../shared/mocks/profiler-core.mock'

import FilterCommand from '../../src/commands/FilterCommand'
import { Container } from '../../src/container'
import { SourceFileMetaDataTreeProvider } from '../../src/treeviews/SourceFileMetaDataTreeProvider'
import { stub_createDirectoryTree } from '../shared/mocks/SourceFileMetaDataProvider.mock'
import ContainerAndStorageMock from '../shared/mocks/ContainerAndStorage.mock'


stub_createDirectoryTree()
let filterCommand: FilterCommand
let container: Container
let treeDataProvider: SourceFileMetaDataTreeProvider
beforeEach(() => {
	const containerAndStorageMock = new ContainerAndStorageMock()
	container = containerAndStorageMock.container
	treeDataProvider = new SourceFileMetaDataTreeProvider(container)
	treeDataProvider.includedFilterPath = undefined
	treeDataProvider.excludedFilterPath = undefined
	filterCommand = new FilterCommand(container, treeDataProvider)
})


describe('FilterCommand', () => {

	test('getIdentifier returns the correct identifier', () => {
		expect(filterCommand.getIdentifier()).toBe('filter')
	})

	test('filter calls filter on the tree data provider', () => {
		const command = 'command'
		const text = 'text'

		jest.spyOn(treeDataProvider, 'filter')

		filterCommand.filter(command, text)
		expect(treeDataProvider.filter).toHaveBeenCalledWith(command, text)
	})
})