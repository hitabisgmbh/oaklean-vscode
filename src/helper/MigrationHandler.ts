import { Disposable } from 'vscode'
import { VersionHelper } from '@oaklean/profiler-core'

import { Container } from '../container'
import { EXTENSION_VERSION } from '../constants/app'

export class MigrationHandler implements Disposable {
	private readonly _disposable: Disposable
	container: Container

	constructor(container: Container) {
		this.container = container
		this._disposable = Disposable.from()

		this.migrate()
	}

	migrate() {
		// Implement migration logic here
		// This logic exists since 0.1.3, before that the lastInstalledVersion was not stored
		const lastInstalledVersion = this.container.storage.get(
			'INSTALLED_EXTENSION_VERSION'
		) as string | undefined
		if (lastInstalledVersion === undefined) {
			// earlier than 0.1.3
			this.migrate_from_v012()	
		}
		this.container.storage.store(
			'INSTALLED_EXTENSION_VERSION',
			EXTENSION_VERSION
		)
	}

	migrate_from_v012() {
		// the key format for stored report hashes changed in 0.1.3
		this.container.reportBackendStorageController.cleanAllStoredReportHashes()
	}

	dispose() {
		this._disposable.dispose()
	}
}
