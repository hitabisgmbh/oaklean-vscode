import * as vscode from 'vscode'

import { getUri } from '../utilities/getUri'
import { getNonce } from '../utilities/getNonce'
import { Profile } from '../types/profile'
import { Color } from '../types/color'
import { Container } from '../container'
import {
	SettingsWebViewProtocol_ChildToParent,
	SettingsWebViewProtocol_ParentToChild
} from '../protocols/settingsWebviewProtocol'
import {
	ExtendedSensorValueType,
	SensorValueTypeNames,
	UnitPerSensorValue
} from '../types/sensorValues'

export class SettingsWebViewPanel {
	public static currentPanel: SettingsWebViewPanel | undefined
	private readonly _panel: vscode.WebviewPanel
	private _disposables: vscode.Disposable[] = []
	private container: Container

	private constructor(container: Container) {
		this.container = container
		this._panel = vscode.window.createWebviewPanel('Settings', 'Settings', vscode.ViewColumn.Beside, {
			enableScripts: true,
			// Restrict the webview to only load resources from the `dist` directory
			localResourceRoots: [vscode.Uri.joinPath(this.container.context.extensionUri, 'dist', 'webview')],
			retainContextWhenHidden: true
		})
		this._panel.onDidDispose(() => this.dispose())
		this._panel.webview.options = {
			enableScripts: true,

			localResourceRoots: [
				this.container.context.extensionUri
			]
		}
		this._panel.webview.html = this._getWebviewContent(
			this._panel.webview,
			this.container.context.extensionUri,
			{
				name: 'default',
				color: Color.Red,
				measurement: 'profilerHits'
			})

		this._panel.webview.onDidReceiveMessage(
			(message: SettingsWebViewProtocol_ChildToParent) => {
				switch (message.command) {
					case 'selectProfile':
						this.container.settingsWebviewController.selectProfile(message.profileName)
						break
					case 'updateProfile':
						this.container.settingsWebviewController.updateProfile(message.profile)
						break
					case 'addProfile':
						this.container.settingsWebviewController.addProfile(message.profile)
						break
					case 'deleteProfile':
						this.container.settingsWebviewController.deleteProfile(message.profileName)
						break
				}
			}
		)
	}

	public static render(container: Container) {
		if (SettingsWebViewPanel.currentPanel) {
			SettingsWebViewPanel.currentPanel._panel.reveal()
		} else {
			SettingsWebViewPanel.currentPanel = new SettingsWebViewPanel(container)

		}
		return SettingsWebViewPanel.currentPanel
	}
	public dispose() {
		SettingsWebViewPanel.currentPanel = undefined

		this._panel.dispose()

		while (this._disposables.length) {
			const disposable = this._disposables.pop()
			if (disposable) {
				disposable.dispose()
			}
		}
	}

	public postMessageToWebview(message: SettingsWebViewProtocol_ParentToChild) {
		this._panel.webview.postMessage(message)
	}

	private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, profile: Profile) {
		const webviewUri = getUri(webview, extensionUri, ['dist', 'webview', 'settingsWebview.js'])
		const stylesUri = getUri(webview, extensionUri, ['dist', 'webview', 'stylesSettingsPage.css'])
		const codiconsUri = getUri(webview, extensionUri, ['dist', 'webview', 'codicons', 'codicon.css'])
		const nonce = getNonce()

		let colorOptions = ''
		for (const colorName of Object.values(Color)) {
			colorOptions += `<vscode-option value="${colorName}">${colorName}</vscode-option>`
		}

		let sensorValueOptions = ''
		for (const sensorValueType of Object.keys(SensorValueTypeNames)) {
			const unit = UnitPerSensorValue[sensorValueType as ExtendedSensorValueType]
			const name = SensorValueTypeNames[sensorValueType as ExtendedSensorValueType]
			sensorValueOptions += `<vscode-option value="${sensorValueType}">${name}${unit ? ` (${unit})` : ''}</vscode-option>`
		}

		// Tip: Install the es6-string-html VS Code extension to enable code highlighting below
		return /*html*/ `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width,initial-scale=1.0">
              <meta http-equiv="Content-Security-Policy"
							content="default-src 'none';
							font-src ${webview.cspSource}; 
							style-src ${webview.cspSource} 'unsafe-inline';
							script-src 'nonce-${nonce}';">
							<link rel="stylesheet" href="${stylesUri}">
							<link rel="stylesheet" href="${codiconsUri}">
            <title>Settings</title>
          </head>
          <body id="webview-body">
            <header>
              <h1 class="title">Settings</h1>
            </header>
            <section id="panels-row">
              <vscode-panels>
                <vscode-panel-tab id="tab-1">Profiles</vscode-panel-tab>
                <vscode-panel-tab id="tab-2">New Profile</vscode-panel-tab>
                <vscode-panel-view id="view-1"> 
                  <div id="tags-container"></div>
                  <section id="notes-form">
                    <div id="inline">
                      <vscode-dropdown id="profileDropdown"></vscode-dropdown>
                      <vscode-button id="deleteButton" appearance="primary">
												<div class="codicon codicon-trashcan icon"></div>
											</vscode-button>
                    </div>
                    <vscode-divider role="separator"></vscode-divider>
                    <h2>Edit Profile</h2>
                    <label for="title">Name</label>
                    <p>Description for name</p>
                    <vscode-text-field readonly id="title" value="${profile.name}"></vscode-text-field>
                    <label for="color">Color</label>
                    <p>Select a color to associate with this profile. 
                      This color will help you visually distinguish this profile from others.</p>
                    <vscode-dropdown id="color" value="${profile.color}">
											${colorOptions}
										</vscode-dropdown>
                    <label for="measurement">Measurement</label>
                    <p>Select the type of measurement this profile is related to.</p>
                    <vscode-dropdown id="measurement" value="${profile.measurement}">
											${sensorValueOptions}
										</vscode-dropdown>
                    <label id="customFormulaLabel" 
                      style="display: none;" for="customFormulaInput">Enter a formula</label>
                    <p id="customFormulaDescription" style="display: none;">Description for customFormula</p>
                    <vscode-text-field id="customFormulaInput" 
                      style="display: none;" placeholder="e.g., aggregatedCPUTime/profilerHits"></vscode-text-field>
                    <vscode-button id="saveChangesButton" appearance="primary">Save Changes</vscode-button>             
                  </section>
                </vscode-panel-view>
                <vscode-panel-view id="view-2">
                  <div id="tags-container"></div>
                  <section id="notes-form">
										<h2>Add Profile</h2>
										<label for="title2">Name</label>
										<p>Description for Name</p>
										<vscode-text-field id="title2" 
										save="${profile.name}" placeholder="Enter a name"></vscode-text-field>
										<div class="dropdown-container">
											<label for="color2">Color</label>
											<p>Select a color to associate with this profile. 
												This color will help you visually distinguish this profile from others.
											</p>
											<vscode-dropdown id="color2">
												${colorOptions}
											</vscode-dropdown>
											<label for="measurement2">Measurement</label>
											<p>Select the type of measurement this profile is related to.</p>
											<vscode-dropdown id="measurement2" placeholder="Pick a Sensor Value">
												${sensorValueOptions}
											</vscode-dropdown>
										</div>
                    <label id="customFormulaLabel2" 
                      for="customFormulaInput2" style="display: none;">Enter a formula</label>
                    <p id="customFormulaDescription2" style="display: none;">Description for customFormula</p>
                    <vscode-text-field id="customFormulaInput2" 
                      style="display: none;" placeholder="e.g., aggregatedCPUTime/profilerHits"></vscode-text-field>
                    <vscode-button id="saveNewProfileButton">Save</vscode-button>
                  </section>
                </vscode-panel-view>
              </vscode-panels>
            </section>
            <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
          </body>
          </html>
        `
	}
}
