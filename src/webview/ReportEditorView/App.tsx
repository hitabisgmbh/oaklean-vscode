import { useEffect, useState } from 'react'
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react'
import './main.css'

import {
	ReportViewProtocolCommands,
	ReportViewProtocol_ChildToParent,
	ReportViewProtocol_ParentToChild
} from '../../protocols/ReportViewProtocol'

declare const acquireVsCodeApi: any

export const vscode = acquireVsCodeApi()

function postToProvider(message: ReportViewProtocol_ChildToParent) {
	vscode.postMessage(message)
}

export function App() {
	const [fileName, setFileName] = useState<string>('')
	const [commitHash, setCommitHash] = useState<string>()
	const [formattedCommitTimestamp, setFormattedCommitTimestamp] =
		useState<string>('')
	const [formattedTimestamp, setFormattedTimestamp] = useState<string>('')
	const [version, setVersion] = useState<string>('')
	const [projectId, setProjectId] = useState<string>('')
	const [uncommittedChanges, setUncommittedChanges] = useState<boolean>()
	const [nodeVersion, setNodeVersion] = useState<string>('')
	const [origin, setOrigin] = useState<string>('')
	const [os, setOs] = useState<string>('')
	const [runtime, setRuntime] = useState<number>()
	const [sensorInterface, setSensorInterface] = useState<string>('')

	function handleExtensionMessages(message: {
		data: ReportViewProtocol_ParentToChild
	}) {
		switch (message.data.command) {
			case ReportViewProtocolCommands.setReportData:
				setFileName(message.data.data.fileName)
				setCommitHash(message.data.data.commitHash)
				setFormattedCommitTimestamp(message.data.data.formattedCommitTimestamp)
				setFormattedTimestamp(message.data.data.formattedTimestamp)
				setVersion(message.data.data.version)
				setProjectId(message.data.data.projectId)
				setUncommittedChanges(message.data.data.uncommittedChanges)
				setNodeVersion(message.data.data.nodeVersion)
				setOrigin(message.data.data.origin)
				setOs(
					message.data.data.os.platform +
						', ' +
						message.data.data.os.distro +
						', ' +
						message.data.data.os.release +
						', ' +
						message.data.data.os.arch
				)
				setRuntime(message.data.data.runtime)
				setSensorInterface(
					message.data.data.sensorInterface === undefined
						? 'None'
						: message.data.data.sensorInterface.type +
								' (type) , ' +
								message.data.data.sensorInterface.sampleInterval +
								' (sampleInterval)'
				)
				break
		}
	}

	useEffect(() => {
		window.addEventListener('message', handleExtensionMessages)
		postToProvider({ command: ReportViewProtocolCommands.viewLoaded })

		return () => {
			window.removeEventListener('message', handleExtensionMessages)
		}
	}, [])

	return (
		<div className="container">
			<div className="sidebar">
				<h2>Report Info</h2>
				<VSCodeButton
					className="jsonButton"
					appearance="primary"
					title="This button will open the original JSON"
					onClick={() =>
						postToProvider({
							command: ReportViewProtocolCommands.openAsJson
						})
					}
				>
					JSON
				</VSCodeButton>
				<input type="hidden" id="filePath" value="${filePath}" />
			</div>
			<div className="info-table">
				<p>This is an overview of the report data.</p>
				<table>
					<tr>
						<td>File Name</td>
						<td>{fileName}</td>
					</tr>
					<tr>
						<td>CommitHash</td>
						<td>{commitHash}</td>
					</tr>
					<tr>
						<td>Commit Date</td>
						<td>{formattedCommitTimestamp}</td>
					</tr>
					<tr>
						<td>Time of Measurement</td>
						<td>{formattedTimestamp}</td>
					</tr>
					<tr>
						<td>Version</td>
						<td>{version}</td>
					</tr>
					<tr>
						<td>ProjectID</td>
						<td>{projectId}</td>
					</tr>
					<tr>
						<td>Uncommitted Changes</td>
						<td>{uncommittedChanges ? 'true' : 'false'}</td>
					</tr>
					<tr>
						<td>Node Version</td>
						<td>{nodeVersion}</td>
					</tr>
					<tr>
						<td>Origin</td>
						<td>{origin}</td>
					</tr>
					<tr>
						<td>OS</td>
						<td>{os}</td>
					</tr>
					<tr>
						<td>V8 CPU Sample Interval</td>
						<td>{runtime}</td>
					</tr>
					<tr>
						<td>SensorInterface</td>
						<td>{sensorInterface}</td>
					</tr>
				</table>
			</div>
		</div>
	)
}
