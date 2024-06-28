export default jest.mock('@oaklean/profiler-core', () => ({
	__esModule: true,
	SourceFileMetaDataTree: {
		fromProjectReport: jest.fn().mockReturnValue({}),
	},
	TimeHelper: {
		getCurrentHighResolutionTime: jest.fn().mockReturnValue('fixed-timestamp'),
	},
}))