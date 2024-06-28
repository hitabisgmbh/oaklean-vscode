export default jest.mock('../../../src/components/QuickPick', () => {
	return jest.fn().mockImplementation(() => ({
		show: jest.fn(),
	}))
})