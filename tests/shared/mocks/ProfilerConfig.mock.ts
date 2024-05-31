import sinon from 'sinon'
import { MicroSeconds_number, ProfilerConfig, ProjectIdentifier_string, UnifiedPath } from '@oaklean/profiler-core'

export const stub_ProfilerConfig = () => {
	const profilerConfigStub = sinon.stub(ProfilerConfig, 'autoResolveFromPath').callsFake(
		(
			startDir: UnifiedPath
		): ProfilerConfig => {
			return ProfilerConfig.fromJSON({
				exportOptions: {
					outDir: 'profiles',
					outHistoryDir: 'profiles_history',
					rootDir: './',
					exportV8Profile: true,
					exportReport: true,
					exportSensorInterfaceData: true
				},
				projectOptions: {
					identifier: '00000000-0000-0000-0000-000000000000' as ProjectIdentifier_string
				},
				runtimeOptions: {
					seeds: {},
					v8: {
						cpu: {
							sampleInterval: 1 as MicroSeconds_number
						}
					}
				},
				registryOptions: {
					url: ''
				}
			})
		})
	return profilerConfigStub
}