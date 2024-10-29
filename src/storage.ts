import type { ExtensionContext, Disposable, SecretStorageChangeEvent, Event } from 'vscode'
import { EventEmitter } from 'vscode'
import { UnifiedPath } from '@oaklean/profiler-core'

import { APP_IDENTIFIER } from './constants/app'
import { Profile } from './types/profile'
import { SortDirection } from './types/sortDirection'
import { SensorValueRepresentation } from './types/sensorValueRepresentation'

export type StorageChangeEvent =
	| {
		/**
		 * The key of the stored value that has changed.
		 */
		readonly key: keyof GlobalStorage;
		readonly workspace: false;
	}
	| {
		/**
		 * The key of the stored value that has changed.
		 */
		readonly key: keyof WorkspaceStorage;
		readonly workspace: true;
	};

export type GlobalStorage = {
	[key: string]: boolean;
}

export type WorkspaceStorage = {
	reportPath: UnifiedPath,
	configPath: UnifiedPath,
	includedFilterPath: string | undefined,
	excludedFilterPath: string | undefined
	sensorValueRepresentation: SensorValueRepresentation
	sortDirection: SortDirection
	enableLineAnnotations: boolean
	profile: Profile
}


export type SecretKeys = string;

export class Storage implements Disposable {
	private readonly _disposable: Disposable
	constructor(private readonly context: ExtensionContext) {
		this._disposable = this.context.secrets.onDidChange(e => this._onDidChangeSecrets.fire(e))
	}

	dispose(): void {
		this._disposable.dispose()
	}

	private _onDidChange = new EventEmitter<StorageChangeEvent>()
	get onDidChange(): Event<StorageChangeEvent> {
		return this._onDidChange.event
	}

	private _onDidChangeSecrets = new EventEmitter<SecretStorageChangeEvent>()
	get onDidChangeSecrets(): Event<SecretStorageChangeEvent> {
		return this._onDidChangeSecrets.event
	}

	get(key: keyof GlobalStorage, defaultValue?: unknown): unknown | undefined {
		const value = this.context.globalState.get(`${APP_IDENTIFIER}:${key}`, defaultValue)
		return value
	}

	async delete(key: keyof GlobalStorage): Promise<void> {
		await this.context.globalState.update(`${APP_IDENTIFIER}:${key}`, undefined)
		this._onDidChange.fire({ key: key, workspace: false })
	}

	async store<T extends keyof GlobalStorage>(key: T, value: GlobalStorage[T] | undefined): Promise<void> {
		await this.context.globalState.update(`${APP_IDENTIFIER}:${key}`, value)
		this._onDidChange.fire({ key: key, workspace: false })
	}

	async getSecret(key: SecretKeys): Promise<string | undefined> {
		return this.context.secrets.get(key)
	}

	async deleteSecret(key: SecretKeys): Promise<void> {
		return this.context.secrets.delete(key)
	}

	async storeSecret(key: SecretKeys, value: string): Promise<void> {
		return this.context.secrets.store(key, value)
	}

	getWorkspace(
		key: keyof WorkspaceStorage,
		defaultValue?: unknown,
	): unknown | undefined {
		const value = this.context.workspaceState.get(`${APP_IDENTIFIER}:${key}`, defaultValue)
		if ((key === 'reportPath') && typeof value === 'string') {
			return new UnifiedPath(value)
		}
		if (key === 'profile') {
			console.debug('profile', value)
		}
		if (key === 'sensorValueRepresentation') {
			console.debug('sensorValueRepresentation', value)
		}
		return value
	}

	async deleteWorkspace(key: keyof WorkspaceStorage): Promise<void> {
		await this.context.workspaceState.update(`${APP_IDENTIFIER}:${key}`, undefined)
		this._onDidChange.fire({ key: key, workspace: true })
	}

	async storeWorkspace<K extends keyof WorkspaceStorage>
		(key: K, value: WorkspaceStorage[K]): Promise<void> {
		await this.context.workspaceState.update(`${APP_IDENTIFIER}:${key}`, value)
		this._onDidChange.fire({ key: key, workspace: true })
	}
}