module.exports = {
	transform: {
		'^.+\\.(ts|tsx)$': [
			'ts-jest',
			{
				diagnostics: {
					ignoreCodes: [151002]
				}
			}
		]
	},
	testEnvironment: 'node',
	testRegex: '/tests/.*\\.(test|spec)?\\.(ts|tsx)$',
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	moduleNameMapper: {
		'\\.(css)$': '<rootDir>/tests/shared/mocks/styleMock.js'
	}
}
