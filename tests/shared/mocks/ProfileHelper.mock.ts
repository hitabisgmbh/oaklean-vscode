import sinon from 'sinon'
import { UnifiedPath } from '@oaklean/profiler-core'

import ProfileHelper from '../../../src/helper/ProfileHelper'
import { WORKSPACE_PATH } from '../constants/app'
import { Color } from '../../../src/types/color'

const WORKSPACE_PATH_UNIFIED = new UnifiedPath(WORKSPACE_PATH)


export const stub_returnSettingsPath = () => {
	const returnSettingsPathStub = sinon.stub(ProfileHelper.prototype, 'returnSettingsPath')
	returnSettingsPathStub.returns(WORKSPACE_PATH_UNIFIED.join('.vscode', 'settings.json'))
	return returnSettingsPathStub
}

export const stub_readProfiles = () => {
	const readProfilesStub = sinon.stub(ProfileHelper.prototype, 'readProfiles')
	readProfilesStub.returns([
		{
			'name': 'Profile 1',
			'color': Color.Red,
			'measurement': 'profilerHits'
		}
	])
	return readProfilesStub
}
