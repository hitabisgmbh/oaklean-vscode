import vscode from 'vscode'

import { getUri } from '../utilities/getUri'
import { getNonce } from '../utilities/getNonce'
import { Container } from '../container'
import {
	SettingsViewProtocolCommands,
	SettingsViewProtocol_ChildToParent,
	SettingsViewProtocol_ParentToChild
} from '../protocols/SettingsViewProtocol'
import { checkFormulaValidity } from '../helper/FormulaHelper'
import { DEFAULT_PROFILE, Profile } from '../types/profile'
import {
	ERROR_FAILED_TO_ADD_PROFILE,
	ERROR_FAILED_TO_DELETE_PROFILE,
	ERROR_FAILED_TO_SAVE_PROFILE,
	ERROR_FORMULA_NOT_VALID,
	INFO_PROFILE_ADDED,
	INFO_PROFILE_ASK_DELETED,
	INFO_PROFILE_DELETED,
	INFO_PROFILE_SAVED,
	NO,
	YES
} from '../constants/infoMessages'
import { ProfileChangeEvent } from '../helper/EventHandler'

export class SettingsViewPanel {
	public static currentPanel: SettingsViewPanel | undefined
	private readonly _panel: vscode.WebviewPanel
	private subscriptions: vscode.Disposable[] = []

	_container: Container
	private constructor(
		private readonly _extensionUri: vscode.Uri,
		container: Container
	) {
		this._container = container
		this.subscriptions.push(
			(this._panel = vscode.window.createWebviewPanel(
				'Settings',
				'Settings',
				vscode.ViewColumn.Beside,
				{
					enableScripts: true,
					// Restrict the webview to only load resources from the `dist` directory
					localResourceRoots: [
						vscode.Uri.joinPath(
							this._container.context.extensionUri,
							'dist',
							'webview'
						)
					],
					retainContextWhenHidden: true
				}
			)),
			this._panel.onDidDispose(() => this.dispose()),
			this._panel.webview.onDidReceiveMessage(
				this.receiveMessageFromWebview.bind(this)
			),
			this._container.eventHandler.onProfileChange(
				this.profileChanges.bind(this)
			),
			this._container.eventHandler.onWebpackRecompile(
				this.hardRefresh.bind(this)
			)
		)

		this._panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._container.context.extensionUri]
		}
		this.hardRefresh()
	}

	hardRefresh() {
		this._panel.webview.html = this._getHtmlForWebview(
			this._panel.webview,
			this._extensionUri
		)
	}

	receiveMessageFromWebview(message: SettingsViewProtocol_ChildToParent) {
		switch (message.command) {
			case SettingsViewProtocolCommands.viewLoaded:
				this.loadProfiles()
				break
			case SettingsViewProtocolCommands.selectProfile:
				this.selectProfile(message.profileName)
				break
			case SettingsViewProtocolCommands.updateProfile:
				this.updateProfile(message.profile)
				break
			case SettingsViewProtocolCommands.addProfile:
				this.addProfile(message.profile)
				break
			case SettingsViewProtocolCommands.deleteProfile:
				this.deleteProfile(
					message.profileName
				)
				break
		}
	}

	public static render(container: Container) {
		if (SettingsViewPanel.currentPanel) {
			SettingsViewPanel.currentPanel._panel.reveal()
		} else {
			SettingsViewPanel.currentPanel = new SettingsViewPanel(
				container.context.extensionUri,
				container
			)
		}
		return SettingsViewPanel.currentPanel
	}

	public dispose() {
		SettingsViewPanel.currentPanel = undefined
		this.subscriptions.forEach((d) => d.dispose())
	}

	public postMessageToWebview(message: SettingsViewProtocol_ParentToChild) {
		this._panel.webview.postMessage(message)
	}

	private _getHtmlForWebview(
		webview: vscode.Webview,
		extensionUri: vscode.Uri
	) {
		const webviewUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'SettingsView.js'
		])
		const stylesUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'SettingsView.css'
		])
		const vendorsUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'webpack',
			'vendors.js'
		])
		const codiconsUri = getUri(webview, extensionUri, [
			'dist',
			'webview',
			'codicons',
			'codicon.css'
		])
		const nonce = getNonce()

		return `
			<!DOCTYPE html>
			<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width,initial-scale=1.0">
					<meta http-equiv="Content-Security-Policy" content="
						default-src 'none';
						font-src ${webview.cspSource}; 
						style-src ${webview.cspSource} 'unsafe-inline';
						script-src 'nonce-${nonce}';
					">
					<link rel="stylesheet" href="${stylesUri}">
					<link rel="stylesheet" href="${codiconsUri}">
				<title>Settings</title>
			</head>
			<body id="webview-body">
				<div id="root"></div>
				<script nonce="${nonce}" src="${vendorsUri}"></script>
				<script nonce="${nonce}" src="${webviewUri}"></script>
			</body>
			</html>
		`
	}

	loadProfiles() {
		this.postMessageToWebview({
			command: SettingsViewProtocolCommands.loadProfiles,
			profile: this._container.profileHelper.currentProfile,
			profiles: this._container.profileHelper.profiles
		})
	}

	private profileChanges(event: ProfileChangeEvent) {
		const profiles = this._container.profileHelper.profiles
		this.postMessageToWebview({
			command: SettingsViewProtocolCommands.loadProfiles,
			profile: event.profile,
			profiles: profiles
		})
	}

	selectProfile(profileName: string) {
		const profiles = this._container.profileHelper.profiles
		const profile = profiles
			? profiles.find((p: Profile) => p.name === profileName)
			: undefined
		this._container.storage.storeWorkspace(
			'profile',
			profile || DEFAULT_PROFILE
		)
	}

	updateProfile(profile: Profile) {
		try {
			if (
				profile.measurement === 'customFormula' &&
				!checkFormulaValidity(profile.formula)
			) {
				vscode.window.showErrorMessage(ERROR_FORMULA_NOT_VALID)
				return
			}
			this._container.profileHelper.updateProfile(profile)
			vscode.window.showInformationMessage(INFO_PROFILE_SAVED)

			this._container.storage.storeWorkspace('profile', profile)
		} catch (error: any) {
			vscode.window.showErrorMessage(
				ERROR_FAILED_TO_SAVE_PROFILE + error.message
			)
		}
	}

	addProfile(profile: Profile) {
		try {
			if (
				profile.measurement === 'customFormula' &&
				!checkFormulaValidity(profile.formula)
			) {
				vscode.window.showErrorMessage(ERROR_FORMULA_NOT_VALID)
				return
			}
			this._container.profileHelper.addProfile(profile)
			vscode.window.showInformationMessage(INFO_PROFILE_ADDED)
			this.selectProfile(profile.name)
			if (SettingsViewPanel.currentPanel) {
				SettingsViewPanel.currentPanel.postMessageToWebview({
					command: SettingsViewProtocolCommands.clearInput
				})
			}
		} catch (error: any) {
			vscode.window.showErrorMessage(
				ERROR_FAILED_TO_ADD_PROFILE + error.message
			)
		}
	}

	async deleteProfile(profileName: string): Promise<void> {
		try {
			const profiles = this._container.profileHelper.profiles
			const confirmation = await vscode.window.showInformationMessage(
				INFO_PROFILE_ASK_DELETED,
				YES,
				NO
			)
			if (confirmation !== YES) {
				return
			}
			this._container.profileHelper.deleteProfile(profileName)
			vscode.window.showInformationMessage(INFO_PROFILE_DELETED)

			const firstProfile =
				profiles && profiles.length > 0
					? profiles[0]
					: DEFAULT_PROFILE

			this._container.storage.storeWorkspace('profile', firstProfile)
		} catch (error: any) {
			vscode.window.showErrorMessage(
				ERROR_FAILED_TO_DELETE_PROFILE + error.message
			)
		}
	}
}
