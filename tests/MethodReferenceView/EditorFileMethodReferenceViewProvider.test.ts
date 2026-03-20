import '../shared/mocks/vscode.mock'

import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { UnifiedPath } from '@oaklean/profiler-core'
import vscode from 'vscode'

import { EditorFileMethodReferenceViewProvider } from '../../src/WebViewProviders/EditorFileMethodReferenceView/EditorFileMethodReferenceViewProvider'
import { EditorFileMethodReferenceViewProtocolCommands } from '../../src/protocols/EditorFileMethodReferenceViewProtocol'
import WorkspaceUtils from '../../src/helper/WorkspaceUtils'

jest.mock(
	'../../src/WebViewProviders/EditorFileMethodReferenceView/EditorFileMethodReferenceViewHtml',
	() => ({
		getEditorFileMethodReferenceViewHtml: () => '<html></html>'
	})
)

type EventHook<T> = {
	register: (handler: (event: T) => void) => { dispose: () => void }
	fire: (event: T) => void
}

function createEventHook<T>(): EventHook<T> {
	let currentHandler: ((event: T) => void) | undefined
	return {
		register: (handler: (event: T) => void) => {
			currentHandler = handler
			return { dispose: () => undefined }
		},
		fire: (event: T) => {
			currentHandler?.(event)
		}
	}
}

describe('EditorFileMethodReferenceViewProvider integration events', () => {
	const reportLoadedHook = createEventHook<{ type: 'ProjectReport' }>()
	const scopeChangeHook = createEventHook<{
		scopeInformation: {
			functionName: string
			className?: string
			namespace?: string
		}
		relativeWorkspacePath: UnifiedPath
		selectedIdentifier?: string
		selectedIdentifierFirstParentWithMeasurements?: string
	}>()
	const textEditorChangeHook = createEventHook<{ editor: unknown }>()
	const textEditorsVisibilityHook = createEventHook<{
		editors: readonly unknown[]
	}>()
	const webpackRecompileHook = createEventHook<{ data?: undefined }>()

	const postMessage = jest.fn<(message: unknown) => void>()
	const getSourceFileMetaData = jest.fn().mockReturnValue(null)
	const onDidReceiveMessage = jest.fn().mockReturnValue({ dispose: jest.fn() })
	const onDidChangeVisibility = jest
		.fn()
		.mockReturnValue({ dispose: jest.fn() })

	const container = {
		eventHandler: {
			onWebpackRecompile: jest.fn(
				(handler: (event: { data?: undefined }) => void) =>
					webpackRecompileHook.register(handler)
			),
			onReportLoaded: jest.fn(
				(handler: (event: { type: 'ProjectReport' }) => void) =>
					reportLoadedHook.register(handler)
			),
			onTextEditorChange: jest.fn(
				(handler: (event: { editor: unknown }) => void) =>
					textEditorChangeHook.register(handler)
			),
			onTextEditorsChangeVisibility: jest.fn(
				(handler: (event: { editors: readonly unknown[] }) => void) =>
					textEditorsVisibilityHook.register(handler)
			),
			onScopeChange: jest.fn(
				(
					handler: (event: {
						scopeInformation: {
							functionName: string
							className?: string
							namespace?: string
						}
						relativeWorkspacePath: UnifiedPath
						selectedIdentifier?: string
						selectedIdentifierFirstParentWithMeasurements?: string
					}) => void
				) => scopeChangeHook.register(handler)
			)
		},
		textDocumentController: {
			projectReport: undefined,
			config: undefined,
			getSourceFileMetaData
		}
	}

	let provider: EditorFileMethodReferenceViewProvider
	let webviewView: {
		webview: {
			postMessage: (message: unknown) => void
			onDidReceiveMessage: (...args: unknown[]) => { dispose: () => void }
			options?: unknown
			html?: string
		}
		onDidChangeVisibility: (...args: unknown[]) => { dispose: () => void }
	}

	function createSourceFileMetaData(
		functions: Array<{ id: number; identifier: string }>
	) {
		const metaEntries = functions.map(
			(entry) =>
				[
					entry.id,
					{
						id: entry.id,
						sourceNodeIndex: {
							identifier: entry.identifier
						}
					}
				] as const
		)

		const map = new Map(metaEntries)

		return {
			functions: {
				values: () => map.values(),
				entries: () => map.entries(),
				get: (id: number) => map.get(id)
			}
		}
	}

	beforeEach(() => {
		postMessage.mockReset()
		getSourceFileMetaData.mockReset().mockReturnValue(null)
		onDidReceiveMessage.mockReset().mockReturnValue({ dispose: jest.fn() })
		onDidChangeVisibility.mockReset().mockReturnValue({ dispose: jest.fn() })
		jest.restoreAllMocks()
		;(
			vscode.window as unknown as { activeTextEditor?: unknown }
		).activeTextEditor = {
			document: { fileName: '/workspace/src/current.ts' }
		}

		provider = new EditorFileMethodReferenceViewProvider(
			{} as never,
			container as never
		)
		webviewView = {
			webview: {
				postMessage,
				onDidReceiveMessage: onDidReceiveMessage as unknown as (
					...args: unknown[]
				) => { dispose: () => void }
			},
			onDidChangeVisibility: onDidChangeVisibility as unknown as (
				...args: unknown[]
			) => { dispose: () => void }
		}
		provider.resolveWebviewView(webviewView as never)
		postMessage.mockClear()
	})

	it('refreshes file + function payload when report changes', () => {
		reportLoadedHook.fire({ type: 'ProjectReport' })

		expect(postMessage).toHaveBeenCalledWith({
			command: EditorFileMethodReferenceViewProtocolCommands.updateFileName,
			fileName: 'current.ts'
		})
		expect(postMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				command:
					EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction
			})
		)
	})

	it('refreshes function payload on matching scope change event', () => {
		getSourceFileMetaData.mockReturnValue(
			createSourceFileMetaData([
				{ id: 1, identifier: '{function:firstFn}' },
				{ id: 2, identifier: '{function:testFn}' }
			])
		)
		jest
			.spyOn(WorkspaceUtils, 'getRelativeWorkspacePath')
			.mockReturnValue(new UnifiedPath('src/current.ts'))

		scopeChangeHook.fire({
			scopeInformation: { functionName: 'testFn' },
			relativeWorkspacePath: new UnifiedPath('src/current.ts'),
			selectedIdentifierFirstParentWithMeasurements: '{function:testFn}'
		})

		expect(postMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				command:
					EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction
			})
		)
		expect(postMessage).toHaveBeenLastCalledWith(
			expect.objectContaining({
				command:
					EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction,
				functionName: 'testFn'
			})
		)
	})
})
