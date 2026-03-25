// @ts-check

import eslint from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'
import eslintPluginImport from 'eslint-plugin-import'
import prettierPlugin from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

export default defineConfig(
	{
		languageOptions: {
			parserOptions: {
				tsconfigRootDir: import.meta.dirname,
				project: ['./tsconfig.eslint.json']
			}
		}
	},
	eslint.configs.recommended,
	tseslint.configs.recommended,
	{
		// rules not applied to test files
		rules: {
			'@typescript-eslint/no-non-null-assertion': 'error'
		},
		ignores: ['**/*.test.ts']
	},
	{
		plugins: {
			'@stylistic': stylistic,
			import: eslintPluginImport,
			prettier: prettierPlugin
		},
		rules: {
			'@typescript-eslint/switch-exhaustiveness-check': 'error',
			'@typescript-eslint/naming-convention': [
				'warn',
				{
					selector: 'enumMember',
					format: ['camelCase', 'UPPER_CASE', 'PascalCase']
				}
			],
			curly: 'warn',
			eqeqeq: 'warn',
			'no-throw-literal': 'warn',
			'no-empty': [
				'error',
				{
					allowEmptyCatch: true
				}
			],
			'no-use-before-define': ['off'],
			'import/extensions': ['off', 'ignorePackages'],
			'import/order': [
				'error',
				{
					'newlines-between': 'always',
					groups: [
						'builtin',
						'external',
						'internal',
						'index',
						'sibling',
						'parent'
					]
				}
			],

			// Prettier rule
			'prettier/prettier': 'error'
		}
	},
	prettierConfig, // Must come AFTER other configs to properly disable conflicting rules
	globalIgnores([
		'scripts/**/*',
		'**/*.d.ts',
		'**/node_modules/**',
		'**/coverage/**/*',
		'**/jest.config.js',
		'**/eslint.config.mjs',
		'**/__mocks__/**/*.js',
		'**/__mocks__/**/*.ts',
		'**/webpack.config.js',
		'**/dist/**/*'
	])
)
