import vscode from 'vscode'
import sinon from 'sinon'

import { SourceFileMetaDataTreeProvider } from '../../../src/treeviews/SourceFileMetaDataTreeProvider'

export const stub_createDirectoryTree = () => {
	const mockSourceFileMetaDataTreeNode: any = {
		includedFilterPath: 'mockIncludedFilterPath',
		excludedFilterPath: 'mockExcludedFilterPath',
	}

	const sourceFileMetaDataTreeProviderStub = sinon.stub(SourceFileMetaDataTreeProvider.prototype, 'createDirectoryTree')
		.callsFake((element) => {
			return Promise.resolve([mockSourceFileMetaDataTreeNode]) as vscode.ProviderResult<any[]>
		})

	return sourceFileMetaDataTreeProviderStub
}