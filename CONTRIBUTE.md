# Prerequisites
- npm 10.2.4
- node 20.11.1

# Setup
1. Install dependencies: `npm ci --ignore-scripts`
2. Build: `npm run build`
3. Run tests: `npm run test`
4. Lint: `npm run lint`

# Executing the VS Code Extension during development
A "Run Extension" configuration is already defined in your .vscode/launch.json. To build and run the extension in development mode, simply open the Run and Debug panel in VS Code and select the Run Extension configuration.

## Hot Reloading
### Webviews
When modifying code while the extension is running, all existing webviews support hot reloading.
To enable hot reloading for a newly created webview, add the following to your **WebviewProvider** (located in **src/WebViewProviders**):
```typescript
this._container.eventHandler.onWebpackRecompile(
	this.hardRefresh.bind(this)
)
```
### Other
Hot reloading is not supported for other parts of the extension.
However, you can still apply your changes by running the `Developer: Reload Window` command in the VS Code window where the extension is being debugged.

# Adding a new webview
To add a new webview to the extension, follow these steps:
1. Create a new React front-end app in `src/webview`
2. Add the new React app to Webpack’s entry points in `webpack.config.js`
3. Create a new WebviewProvider in `src/WebViewProviders` to load the React Webview
4. Register the webview in `src/container.ts` by adding:
```typescript
export class Container {
	// ....
	// insert into the container class
	private readonly _newViewProvider: NewViewProvider
	get newViewProvider() {
		return this._newViewProvider
	}

	private constructor(
		context: ExtensionContext,
		storage: Storage
	) {
		// ....

		// register the new WebviewProvider
		this.context.subscriptions.push(
			this._newViewProvider = new NewViewProvider(this.context.extensionUri, this)
		)
	}
}
```
5. Finally, add the necessary configuration to `package.json` at the appropriate location.<br>
For more details on Webviews, see the [VS Code Webview Extension Guide]((https://code.visualstudio.com/api/extension-guides/webview))


# Bugs
## Where to Find Known Issues
We’ll use GitHub Issues to track all public bugs. We’ll monitor reports closely and indicate whenever an internal fix is underway. Before opening a new issue, please check to see if the problem has already been reported.

## Reporting New Issues
The most effective way to help us fix your bug is to include a minimal reproducible example. Please share a public repository containing a runnable test case.

## Security Bugs
See [SECURITY.md](./SECURITY.md) for the safe disclosure of security bugs. With that in mind, please do not file public issues; go through the process outlined there.

# Credits
This project exists thanks to all the people who [contribute](https://github.com/hitabisgmbh/oaklean-vscode/graphs/contributors)

<a href="https://github.com/hitabisgmbh/oaklean-vscode/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=hitabisgmbh/oaklean-vscode" />
</a>

# License
By contributing to Oaklean, you agree that your contributions will be licensed under its MIT license.