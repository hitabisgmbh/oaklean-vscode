import sinon from 'sinon'

import QuickPick from '../../../src/components/QuickPick'

export const spy_QuickPick_show = () => {
	const quickPickShowStub = sinon.spy(QuickPick.prototype, 'show')

	return quickPickShowStub
}