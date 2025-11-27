import vscode, { Disposable } from 'vscode'
import {
	ProjectReport,
	RegistryHelper,
	UnifiedPath
} from '@oaklean/profiler-core'

import { Container } from '../container'
import WorkspaceUtils from '../helper/WorkspaceUtils'

export default class ReportBackendStorageController implements Disposable {
	container: Container
	private _disposable: Disposable

	private uploadInProgress = false
	private hashesWithErrors = new Set<string>()

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

	cleanAllStoredReportHashes(): void {
		for (const key of this.container.storage.keys()) {
			if (key.startsWith('reportHash.')) {
				console.debug('Cleaning up report hash key:', key)
				this.container.storage.delete(key)
			}
		}
	}
	
	dispose() {
		throw new Error('Method not implemented.')
	}

	reportPathShouldNotBeStored(reportPath: string): boolean {
		const shouldNotBeStored = this.container.storage.get(`reportPathShouldNotBeStored-${reportPath}`)
		return shouldNotBeStored === true
	}

	setReportPathShouldNotBeStored(reportPath: string): void {
		this.container.storage.store(`reportPathShouldNotBeStored-${reportPath}`, true)
	}

	markHashAsChecked(hash: string | undefined, url: string): void {
		if (hash === undefined) {
			return
		}
		if (this.container.storage) {
			this.container.storage.store(`reportHash.${url}.${hash}`, true)
		}
	}

	markHashAsError(hash: string): void {
		this.hashesWithErrors.add(hash)
	}

	hasHashError(hash: string): boolean {
		return this.hashesWithErrors.has(hash)
	}

	isHashChecked(hash: string | undefined, url: string): boolean {
		if (hash === undefined) {
			return false
		}
		const hashKey = `reportHash.${url}.${hash}`
		return this.container.storage.get(hashKey) as boolean || false
	}

	hashesForReportPaths(
		projectReportPaths: string[],
		url: string
	): Map<string, string> {
		const batchReportPathHashes = new Map<string, string>()
		for (let j = 0; j < projectReportPaths.length; j++) {
			const reportPath = projectReportPaths[j]
			const shouldNotBeStored = this.reportPathShouldNotBeStored(reportPath)
			if (shouldNotBeStored) {
				console.debug('Report should not be stored!', reportPath)
				continue
			}
			const hash = ProjectReport.hashFromBinFile(new UnifiedPath(reportPath))
			if (hash === undefined || this.isHashChecked(hash, url)) {
				console.debug('Hash already checked!', hash, reportPath)
				continue
			}
			if (this.hasHashError(hash)) {
				console.debug('Hash had errors before, skipping!', hash, reportPath)
				continue
			}
			batchReportPathHashes.set(hash, reportPath)
		}
		return batchReportPathHashes
	}

	async checkAndUploadReports() {
		if (this.uploadInProgress) {
			console.debug('Previous run still in progress, skipping this run.')
			return
		}

		this.uploadInProgress = true

		const configPaths = WorkspaceUtils.getWorkspaceProfilerConfigPaths()
		for (const configPath of configPaths) {
			const { config } = WorkspaceUtils.resolveConfigFromFile(configPath)

			if (config === undefined || config.uploadEnabled() === false) {
				continue
			}

			const projectReportPaths = await WorkspaceUtils.getProjectReportPathsForConfig(config)
			if (!projectReportPaths || projectReportPaths.length === 0) {
				continue
			}
			const url = config.registryOptions.url

			const batchSize = 99
			for (let i = 0; i < projectReportPaths.length; i += batchSize) {
				const batchReportPaths = projectReportPaths.slice(i, i + batchSize)
				const batchReportPathHashes = this.hashesForReportPaths(batchReportPaths, url)

				if (batchReportPathHashes.size === 0) {
					continue
				}

				const allHashes = Array.from(batchReportPathHashes.keys())
				const checkHashesUrl = `http:/${url}/check-existence`

				let response
				try {
					response = await fetch(checkHashesUrl, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							hashes: allHashes
						})
					})
					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`)
					}
				} catch (error: any) {
					if (error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
						console.debug('Error fetching URL due to timeout')
					} else {
						console.debug('Error fetching URL:', error)	
					}
					this.uploadInProgress = false
					return
				}

				const responseData = await response.json()
				for (const hash in responseData) {
					if (responseData[hash] === false) {
						const reportPath = batchReportPathHashes.get(hash)
						if (reportPath) {
							let report
							try {
								report = ProjectReport.loadFromFile(new UnifiedPath(reportPath), 'bin')
							} catch (e) {
								this.markHashAsError(hash)
								console.debug('Error loading report!', e)
								continue
							}
							if (report === undefined) {
								console.debug('Report not found!', reportPath)
								continue
							}
							const shouldBeUploaded = await report.shouldBeStoredInRegistry()

							if (!shouldBeUploaded) {
								this.setReportPathShouldNotBeStored(reportPath)
								continue
							}

							const result = await RegistryHelper.uploadToRegistry(report, config)
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
						}
					} else if (responseData[hash] && responseData[hash] === true) {
						this.markHashAsChecked(hash, url)
					}
				}
			}
		}

		this.uploadInProgress = false
	}

}