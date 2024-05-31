// eslint-disable-next-line
const { build } = require('esbuild')
// eslint-disable-next-line @typescript-eslint/no-var-requires
// eslint-disable-next-line
const { copy } = require('esbuild-plugin-copy')

//@ts-check
/** @typedef {import('esbuild').BuildOptions} BuildOptions **/

/** @type BuildOptions */
const baseConfig = {
	bundle: true,
	minify: process.env.NODE_ENV === 'production',
	sourcemap: 'inline',
}


// This watch config adheres to the conventions of the esbuild-problem-matchers
// extension (https://github.com/connor4312/esbuild-problem-matchers#esbuild-via-js)
/** @type BuildOptions */
const watchConfig = {
	watch: {
		onRebuild(error, result) {
			console.log('[watch] build started')
			if (error) {
				error.errors.forEach((error) =>
					console.error(
						`> ${error.location.file}:${error.location.line}:${error.location.column}: error: ${error.text}`
					)
				)
			} else {
				console.log('[watch] build finished')
			}
		},
	},
}

/** @type BuildOptions */
const extensionConfig = {
	...baseConfig,
	entryPoints: ['./src/extension.ts'],
	bundle: true,
	outfile: './dist/extension.js',
	external: ['vscode', 'fsevents', '@babel/preset-typescript/package.json'],
	format: 'cjs',
	platform: 'node',
}


// Build script
async function main() {
	const args = process.argv.slice(2)
	console.log()
	try {
		if (args.includes('--watch')) {
			// Build webview code
			console.log('[watch] build started')
			await build({
				...watchConfig,
			})
			await build({
				...extensionConfig,
				...watchConfig,
			})
			console.log('[watch] build finished')
		} else {
			// Build extension code
			await build(extensionConfig)
			console.log('build complete')
		}
	} catch (err) {
		process.stderr.write(err.message)
		process.exit(1)
	}
}

main()