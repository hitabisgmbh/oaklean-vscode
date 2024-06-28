export default jest.mock('../../../src/helper/FormulaHelper', () => ({
	checkFomulaValidity: jest.fn(),
}))
