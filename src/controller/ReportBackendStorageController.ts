import vscode, { Disposable } from 'vscode'
import { ProjectReport, UnifiedPath } from '@oaklean/profiler-core'

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

	reportPathShouldNotBeStored(reportPath: string): boolean {
		const shouldNotBeStored = this.container.storage.get(`reportPathShouldNotBeStored-${reportPath}`)
		return shouldNotBeStored as boolean
	}

	setReportPathShouldNotBeStored(reportPath: string): void {
		this.container.storage.store(`reportPathShouldNotBeStored-${reportPath}`, true)
	}
	
	markHashAsChecked(hash: string | undefined, url: string): void {
		if (hash === undefined) {
			return
		}
		if (this.container.storage) {
			this.container.storage.store(`reportHash.${`${url}${hash}`}`, true)
		}
	}
	
	isHashChecked(hash: string | undefined, url: string): boolean {
		if (hash === undefined) {
			return false
		}
		const hashKey = `reportHash.${`${url}${hash}`}`
		return this.container.storage.get(hashKey) as boolean || false
	
	}

	async checkAndUploadReports() {
		const configPaths = WorkspaceUtils.getWorkspaceProfilerConfigPaths()
		for (const configPath of configPaths) {
			const unifiedConfigPath = new UnifiedPath(configPath)
			const config = WorkspaceUtils.resolveConfigFromFile(unifiedConfigPath)

			if (config === undefined) {
				continue
			}

			const projectReportPaths = await WorkspaceUtils.getProjectReportPathsForConfig(config)
			if (!projectReportPaths || projectReportPaths.length === 0) {
				continue
			}
			const url = config.registryOptions.url

			const batchSize = 99
			const batchReportPathHashes = new Map<string, string>()
			for (let i = 0; i < projectReportPaths.length; i += batchSize) {
				const batchReportPaths = projectReportPaths.slice(i, i + batchSize)
				for (let j = 0; j < batchReportPaths.length; j++) {
					const reportPath = batchReportPaths[j]
					const shouldNotBeStored = this.reportPathShouldNotBeStored(reportPath)
					if (shouldNotBeStored){
						continue
					}
					const hash = ProjectReport.hashFromBinFile(new UnifiedPath(reportPath))
					if (hash === undefined || this.isHashChecked(hash, url)) {
						continue
					}
					batchReportPathHashes.set(hash, reportPath)
				}

				if (batchReportPathHashes.size === 0) {
					continue
				}
				const allHashes = Array.from(batchReportPathHashes.keys())
				const urlWithHashes = `http:/${url}/check-existence?` + allHashes.map(hash => `hashes[]=${hash}`).join('&')

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
	
				const responseData = await response.json()
				for (const hash in responseData ){
					if (responseData[hash] === false) {
						const reportPath = batchReportPathHashes.get(hash)
						if (reportPath) {
							let report
							try {
								report = ProjectReport.loadFromFile(new UnifiedPath(reportPath), 'bin', config)
							} catch (e){
								console.debug('Error loading report!', e)
								continue
							}
							if (!report){
								console.debug('Report not found!', reportPath)
								continue
							}
							const shouldBeUploaded = await report.shouldBeStoredInRegistry()
						
							if (!shouldBeUploaded) {
								this.setReportPathShouldNotBeStored(reportPath)
								continue
							}
		
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
						} 
				} else if (responseData[hash] && responseData[hash] === true) {
						this.markHashAsChecked(hash, url)
					}
			}
		}
	}
	}

}