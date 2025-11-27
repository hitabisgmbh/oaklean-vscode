export default jest.mock('../../../src/constants/app', () => ({
	APP_IDENTIFIER: 'oaklean',
	DEBUG_MODE: true,
	EXTENSION_VERSION: '1.0.0-mock',
}))