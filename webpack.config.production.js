// eslint-disable-next-line
const webpack = require('webpack')
// eslint-disable-next-line
const path = require('path')
// eslint-disable-next-line
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
	entry: {
		EditorFileMethodView: './src/webview/EditorFileMethodView/main.tsx', // Entry point for React app
		MethodView: './src/webview/MethodView/main.tsx', // Entry point for React app
		ThemeColorViewer: './src/webview/ThemeColorViewer/main.tsx', // Entry point for Theme Color Viewer
	},
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist/webview/webpack'), // Output directory for bundled files
    filename: '[name].js', // Output bundle file
		publicPath: '', // Important for loading chunks
		clean: true, // Clean the output directory before emit
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'], // Extensions to resolve
    alias: {},
    fallback: {
			vscode: false
		},
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/, // Match TypeScript files
        use: 'ts-loader', // Use ts-loader to transpile TypeScript
        exclude: /node_modules/,
      },
			{
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      }
    ],
  },
	mode: 'production',
  plugins: [
    new webpack.DefinePlugin({
      __dirname: JSON.stringify('/__dirname'),
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
  ],
	optimization: {
    splitChunks: {
      chunks: 'all',
      name: 'vendors', // creates a vendors.js
    },
  }
}
