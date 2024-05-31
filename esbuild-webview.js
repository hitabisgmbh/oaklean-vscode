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


// Config for webview source code (to be run in a web-based context)
/** @type BuildOptions */
const webviewConfig = {
	...baseConfig,
	target: 'es2020',
	format: 'esm',
	entryPoints: ['./src/webview/**/*.ts'],
	outdir: './dist/webview',
	external: ['vscode'],
	plugins: [
		copy({
			resolveFrom: 'cwd',
			assets: {
				from: './node_modules/@vscode/codicons/dist/**',
				to: './dist/webview/codicons',
			}
		}),
		copy({
			resolveFrom: 'cwd',
			assets: {
				from: ['./src/webview/styles/*.css'],
				to: ['./dist/webview'],
			},
		}),
	],
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
				...webviewConfig,
				...watchConfig,
			})
			console.log('[watch] build finished')
		} else {
			// Build webview code
			await build(webviewConfig)
			console.log('build complete')
		}
	} catch (err) {
		process.stderr.write(err.message)
		process.exit(1)
	}
}

main()