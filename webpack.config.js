// eslint-disable-next-line
const webpack = require('webpack')
// eslint-disable-next-line
const path = require('path')
// eslint-disable-next-line
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
// eslint-disable-next-line
const nodeExternals = require('webpack-node-externals')
// eslint-disable-next-line
const CopyWebpackPlugin = require('copy-webpack-plugin')

const mode = process.env.NODE_ENV || 'production'

console.log(`Building in ${mode} mode`)

const watchOptions = {
	watch: true,
	watchOptions: {
		poll: 1000, // fallback for broken fs watching
		ignored: /node_modules/
	}
}

const baseConfig = {
	plugins: [new webpack.ProgressPlugin()],
	devtool: 'source-map',
	infrastructureLogging: {
		level: 'info'
	},
	mode: mode,
	...(mode === 'production' ? {} : watchOptions)
}

const extensionConfig = {
	...baseConfig,
	entry: {
		Extension: './src/extension.ts'
	},
	target: 'node',
	output: {
		path: path.resolve(__dirname, 'dist', 'extension'),
		filename: 'extension.js',
		libraryTarget: 'commonjs2',
		clean: true
	},
	resolve: {
		extensions: ['.ts', '.js']
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: 'ts-loader',
				exclude: /node_modules/
			}
		]
	},
	externals:
		mode === 'production'
			? {
				vscode: 'commonjs vscode', // VS Code API is provided at runtime, don't bundle it
				'osx-temperature-sensor': 'commonjs osx-temperature-sensor', // Exclude osx-temperature-sensor in production
			}
			: [
					{
						vscode: 'commonjs vscode',
					},
					// Exclude node_modules from the bundle in development mode
					nodeExternals({
						allowlist: [
							// Any packages you want to include in the bundle
						],
						additionalModuleDirs: ['node_modules']
					})
			]
}

const webviewConfig = {
	...baseConfig,
	entry: {
		FilterView: './src/webview/FilterView/main.tsx',
		ReportWebview: './src/webview/ReportWebview.ts',
		settingsWebview: './src/webview/settingsWebview.ts',
		EditorFileMethodView: './src/webview/EditorFileMethodView/main.tsx',
		MethodView: './src/webview/MethodView/main.tsx',
		ThemeColorViewer: './src/webview/ThemeColorViewer/main.tsx' // Entry point for Theme Color Viewer
	},
	output: {
		path: path.resolve(__dirname, 'dist', 'webview', 'webpack'), // Output directory for bundled files
		filename: '[name].js', // Output bundle file
		publicPath: '', // Important for loading chunks
		clean: true // Clean the output directory before emit
	},
	resolve: {
		extensions: ['.ts', '.tsx', '.js', '.jsx'], // Extensions to resolve
		alias: {},
		fallback: {
			vscode: false
		}
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/, // Match TypeScript files
				use: 'ts-loader', // Use ts-loader to transpile TypeScript
				exclude: /node_modules/
			},
			{
				test: /\.css$/i,
				use: [MiniCssExtractPlugin.loader, 'css-loader']
			}
		]
	},
	plugins: [
		...baseConfig.plugins,
		new webpack.DefinePlugin({
			__dirname: JSON.stringify('/__dirname')
		}),
		new MiniCssExtractPlugin({
			filename: '[name].css'
		}),
		new CopyWebpackPlugin({
			patterns: [
				{
					from: path.resolve(__dirname, 'node_modules/@vscode/codicons/dist'),
					to: path.resolve(__dirname, 'dist/webview/codicons')
				},
				{
					from: path.resolve(__dirname, 'src/webview/styles'),
					to: path.resolve(__dirname, 'dist/webview'),
					globOptions: {
						ignore: ['**/*.!(css)'] // only .css files
					}
				}
			]
		})
	],
	optimization: {
		splitChunks: {
			chunks: 'all',
			name: 'vendors' // creates a vendors.js
		}
	}
}

module.exports = [extensionConfig, webviewConfig]
