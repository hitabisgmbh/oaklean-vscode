import { ProjectReport, UnifiedPath } from '@oaklean/profiler-core'
import { glob } from 'glob'
import vscode, { Disposable } from 'vscode'

import { Container } from '../container'
import WorkspaceUtils from '../helper/WorkspaceUtils'

export default class ReportBackendStorageController implements Disposable {
	container: Container
	private _disposable: Disposable
	constructor(container: Container) {
		this.container = container
		this._disposable = vscode.Disposable.from(
		)
		console.debug('ReportBackendStorageController created!')
		// sends every minute a request to the registry to check if the reports are already uploaded
		// and if not uploads them
		this.checkAndUploadReports()
		setInterval(() => this.checkAndUploadReports(), 60000)
	}
	dispose() {
		throw new Error('Method not implemented.')
	}

	async checkAndUploadReports() {
		const workspaceDir = WorkspaceUtils.getWorkspaceDir()
		if (!workspaceDir) {
			return
		}
		const config = WorkspaceUtils.getWorkspaceProfilerConfig()
		const url = config.registryOptions.url
		const workSpaceDir = WorkspaceUtils.getWorkspaceDir()?.join('**', '*.oak').toString()
		if (!workSpaceDir) {
			return
		}
		const projectReportPaths = glob.sync(workSpaceDir, { ignore: ['**/node_modules/**', '**/dist/**'] })
			.map((profilePath) => workspaceDir.pathTo(profilePath).toString())
		const batchSize = 99
		for (let i = 0; i < projectReportPaths.length; i += batchSize) {
			const batchFiles = projectReportPaths.slice(i, i + batchSize)
			const hashes = (await Promise.all(batchFiles.map(async (filePath) => {
				const unifiedFilePath = new UnifiedPath(filePath)
				const reportPath = WorkspaceUtils.getWorkspaceDir()?.join(unifiedFilePath)
				if (!reportPath) {
					return
				}

				const hash = ProjectReport.hashFromBinFile(reportPath)
				if (this.isHashChecked(hash, url)) {
					return
				}
				let projectReport
				try {
					projectReport = ProjectReport.loadFromFile(reportPath, 'bin')
				} catch (e) {
					return
				}
				const shouldBeStored = await projectReport?.shouldBeStoredInRegistry()
				if (projectReport === undefined || !shouldBeStored) {
					return
				}

				return hash

			}))).filter(hash => hash !== undefined)

			if (hashes.length === 0) {
				continue
			}


			const urlWithHashes = `http:/${url}/check-existence?` + hashes.map(hash => `hashes[]=${hash}`).join('&')
			let response
			try {
				response = await fetch(urlWithHashes)
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`)
				}
			} catch (error) {
				console.error('Error fetching URL:', error)
				return
			}

			const data = await response.json()
			for (const hash of hashes) {
				if (hash && !data[hash]) {
					const filePath = batchFiles[hashes.indexOf(hash)]
					const unifiedFilePath = new UnifiedPath(filePath)
					const reportPath = WorkspaceUtils.getWorkspaceDir()?.join(unifiedFilePath)
					if (!reportPath) {
						console.debug('reportPath not found!', unifiedFilePath, WorkspaceUtils.getWorkspaceDir())
						continue
					}
					const report = ProjectReport.loadFromFile(reportPath, 'bin')

					if (!report) {
						console.debug('report not found!', reportPath)
						continue
					}

					const result = await report.uploadToRegistry(config)
					if (result === undefined) {
						console.debug('upload failed! report path: ', reportPath, ' url: ', url)
						continue
					}

					if (result.data.success === true ||
						(result.data.success === false && result.data.error === 'REPORT_EXISTS')) {
						result.data.success ? console.debug('Upload successful!', reportPath) : console.debug('Report already exists!', reportPath)
						this.markHashAsChecked(hash, url)
					} else {
						console.debug('Upload failed!', result.data.error, ' report path: ', reportPath, ' url: ', url)
						continue
					}
				} else if (hash && data[hash]) {
					this.markHashAsChecked(hash, url)
				}

			}
		}
	}

	isHashChecked(hash: string | undefined, url: string): boolean {
		if (hash === undefined) {
			return false
		}
		const hashKey = `reportHash.${`${url}${hash}`}`
		return this.container.storage.get(hashKey) as boolean || false

	}

	markHashAsChecked(hash: string | undefined, url: string): void {
		if (hash === undefined) {
			return
		}
		if (this.container.storage) {
			this.container.storage.store(`reportHash.${`${url}${hash}`}`, true)
		}
	}
}

