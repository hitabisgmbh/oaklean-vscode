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
		setInterval(() => this.checkAndUploadReports(), 10000)
	}
	dispose() {
		throw new Error('Method not implemented.')
	}

	async checkAndUploadReports() {
		const cofigPaths = WorkspaceUtils.getWorkspaceProfilerConfigPaths()
		for (const configPath of cofigPaths) {

			const unifiedConfigPath = new UnifiedPath(configPath)
			const config = WorkspaceUtils.resolveConfigFromFile(unifiedConfigPath)

			if (config === undefined) {
				continue
			}
			const configRoot = WorkspaceUtils.configRootPath(unifiedConfigPath, config)
			if (!configRoot) {
				continue
			}

			const projectReports = await WorkspaceUtils.getProjectReportsForConfigToUpload(configRoot, config)
			if (!projectReports || projectReports.length === 0) {
				continue
			}
			const url = config.registryOptions.url

			const batchSize = 99
			for (let i = 0; i < projectReports.length; i += batchSize) {
				const batchReports = projectReports.slice(i, i + batchSize)
				const hashes = (await Promise.all(batchReports.map(async (report) => {
					const hash = report.hash()
					if (this.isHashChecked(hash, url)) {
						return
					}
					return hash
				})))
				.filter((hash): hash is string => hash !== undefined)

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
					console.debug('Error fetching URL:', error)
					return
				}
	
				const data = await response.json()
				for (const hash of hashes) {
					if (hash && !data[hash]) {
						const report = batchReports[hashes.indexOf(hash)]
						const result = await report.uploadToRegistry(config)
						if (result === undefined) {
							console.debug('upload failed! report path: ', report, ' url: ', url)
							continue
						}
	
						if (result.data.success === true ||
							(result.data.success === false && result.data.error === 'REPORT_EXISTS')) {
							result.data.success ? console.debug('Upload successful!', report) : console.debug('Report already exists!', report)
							this.markHashAsChecked(hash, url)
						} else {
							console.debug('Upload failed!', result.data.error, ' report path: ', report, ' url: ', url)
							continue
						}
					} else if (hash && data[hash]) {
						this.markHashAsChecked(hash, url)
					}
	
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

