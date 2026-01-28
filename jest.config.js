module.exports = {
	transform: {
		'^.+\\.ts?$': [
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
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
}
