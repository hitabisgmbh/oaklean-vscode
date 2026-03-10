import sinon from 'sinon'

import { Storage } from '../../../src/storage'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stub_getWorkspace = (storage: Storage, value: any) => {
	const stub_getWorkspace = sinon.stub(storage, 'getWorkspace')
	stub_getWorkspace.returns(value)
	return stub_getWorkspace
}
