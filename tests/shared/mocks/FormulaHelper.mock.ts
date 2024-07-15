export default jest.mock('../../../src/helper/FormulaHelper', () => ({
	checkFormulaValidity: jest.fn(),
}))
