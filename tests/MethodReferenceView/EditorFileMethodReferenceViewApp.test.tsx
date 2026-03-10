/** @jest-environment jsdom */

import React, { ReactNode } from 'react'
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen
} from '@testing-library/react'
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	jest
} from '@jest/globals'

import {
	EditorFileMethodReferenceViewProtocolCommands
} from '../../src/protocols/EditorFileMethodReferenceViewProtocol'
import { OpenSourceLocationProtocolCommands } from '../../src/protocols/OpenSourceLocationProtocol'

jest.mock('@vscode/webview-ui-toolkit/react', () => ({
	// Replace toolkit button with plain button so jsdom tests can click it reliably.
	VSCodeButton: ({ children, onClick }: {
		children?: ReactNode,
		onClick?: () => void
	}) =>
		React.createElement(
			'button',
			{
				type: 'button',
				onClick
			},
			children
		)
}))

type VSCodeApiLike = {
	postMessage: (message: unknown) => void
}

type GlobalWithAcquire = typeof globalThis & {
	acquireVsCodeApi?: () => VSCodeApiLike
}

type AppComponentType = () => React.ReactElement

let postMessageMock = jest.fn<(message: unknown) => void>()
let AppComponent: AppComponentType

beforeAll(async () => {
	// Provide the VS Code webview API expected by the React app.
	const globalForTest = globalThis as GlobalWithAcquire
	globalForTest.acquireVsCodeApi = () => ({
		postMessage: (message: unknown) => {
			postMessageMock(message)
		}
	})
	// Import App only after API mock is attached to avoid initialization failures.
	const appModule = await import('../../src/webview/EditorFileMethodReferenceView/App')
	AppComponent = appModule.App
})

beforeEach(() => {
	postMessageMock = jest.fn<(message: unknown) => void>()
})

function renderFreshApp() {
	// Fresh render helper to avoid shared UI state between tests.
	render(React.createElement(AppComponent))
	return { postMessage: postMessageMock }
}

function dispatchReferenceMessage(data: unknown) {
	// Simulate provider -> webview postMessage events.
	act(() => {
		window.dispatchEvent(new MessageEvent('message', { data }))
	})
}

afterEach(() => {
	cleanup()
})

describe('EditorFileMethodReferenceView App UI', () => {
	it('requests file and function payload on mount and renders file name updates', () => {
		// App bootstraps by requesting initial payload and renders pushed file name.
		const { postMessage } = renderFreshApp()

		expect(postMessage).toHaveBeenNthCalledWith(1, {
			command: EditorFileMethodReferenceViewProtocolCommands.requestFileName
		})
		expect(postMessage).toHaveBeenNthCalledWith(2, {
			command: EditorFileMethodReferenceViewProtocolCommands.requestFirstFunction
		})

		dispatchReferenceMessage({
			command: EditorFileMethodReferenceViewProtocolCommands.updateFileName,
			fileName: 'sample.ts'
		})
		expect(screen.getByText('sample.ts')).toBeTruthy()
	})

	it('cycles sort metric and reorders intern entries based on selected metric', () => {
		// Clicking the metric label should cycle Cpu(T) -> Cpu(E) and reorder rows accordingly.
		renderFreshApp()

		dispatchReferenceMessage({
			command: EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction,
			functionName: 'currentFn',
			intern: [
				{
					name: 'entryCpuLow',
					cpuTime: 1,
					cpuEnergy: 10,
					ramEnergy: 1
				},
				{
					name: 'entryCpuHigh',
					cpuTime: 100,
					cpuEnergy: 1,
					ramEnergy: 1
				}
			]
		})

		const initialText = document.body.textContent ?? ''
		expect(initialText.indexOf('entryCpuHigh')).toBeLessThan(
			initialText.indexOf('entryCpuLow')
		)
		const sortLabel = document.querySelector('.reference-toolbar__sort-label')
		expect(sortLabel?.textContent).toBe('Cpu(T)')

		const sortMetricLabel = screen.getByTitle('Sort entries by Cpu(T), Cpu(E), Ram(E)')
		fireEvent.click(sortMetricLabel)

		expect(sortLabel?.textContent).toBe('Cpu(E)')
		const sortedByEnergyText = document.body.textContent ?? ''
		expect(sortedByEnergyText.indexOf('entryCpuLow')).toBeLessThan(
			sortedByEnergyText.indexOf('entryCpuHigh')
		)
	})

	it('toggles sort direction and sorts entries ascending', () => {
		renderFreshApp()

		dispatchReferenceMessage({
			command: EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction,
			functionName: 'currentFn',
			intern: [
				{
					name: 'entryLow',
					cpuTime: 1
				},
				{
					name: 'entryHigh',
					cpuTime: 100
				}
			]
		})

		const initialText = document.body.textContent ?? ''
		expect(initialText.indexOf('entryHigh')).toBeLessThan(
			initialText.indexOf('entryLow')
		)
		const sortDirectionButton = screen.getByTitle('Toggle sort direction (Desc/Asc)')
		const initialActiveDownIcon = sortDirectionButton.querySelector(
			'.codicon-arrow-down.reference-toolbar__sort-direction-icon--active'
		)
		expect(initialActiveDownIcon).not.toBeNull()

		fireEvent.click(sortDirectionButton)

		const sortedAscendingText = document.body.textContent ?? ''
		expect(sortedAscendingText.indexOf('entryLow')).toBeLessThan(
			sortedAscendingText.indexOf('entryHigh')
		)
		const sortLabel = document.querySelector('.reference-toolbar__sort-label')
		expect(sortLabel?.textContent).toBe('Cpu(T)')
		const activeUpIcon = sortDirectionButton.querySelector(
			'.codicon-arrow-up.reference-toolbar__sort-direction-icon--active'
		)
		expect(activeUpIcon).not.toBeNull()
	})

	it('toggles filtering of runtime-only entries through eye button', () => {
		// Eye toggle hides entries flagged as runtime-only.
		renderFreshApp()

		dispatchReferenceMessage({
			command: EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction,
			functionName: 'currentFn',
			intern: [
				{
					name: 'normalEntry',
					cpuTime: 2
				},
				{
					name: 'runtimeOnlyEntry',
					cpuTime: 3,
					notPresentInOriginalSourceCode: true
				}
			]
		})

		expect(screen.getByText('normalEntry')).toBeTruthy()
		expect(screen.getByText('runtimeOnlyEntry')).toBeTruthy()

		const visibilityToggle = screen.getByTitle(
			'Show/Hide entries that are not present in original source code'
		)
		fireEvent.click(visibilityToggle)

		expect(screen.getByText('normalEntry')).toBeTruthy()
		expect(screen.queryByText('runtimeOnlyEntry')).toBeNull()
	})

	it('posts navigation only for navigable references and posts close command', () => {
		// Click should navigate only for valid rows; Close button sends close command.
		const { postMessage } = renderFreshApp()

		dispatchReferenceMessage({
			command: EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction,
			functionName: 'currentFn',
			intern: [
				{
					name: 'navigableEntry',
					cpuTime: 1,
					identifier: '{function:navigableEntry}',
					relativePath: 'src/navigable.ts',
					isNavigable: true
				},
				{
					name: 'notNavigableEntry',
					cpuTime: 2,
					isNavigable: false
				}
			]
		})

		postMessage.mockClear()
		fireEvent.click(screen.getByText('navigableEntry'))
		fireEvent.click(screen.getByText('notNavigableEntry'))

		expect(postMessage).toHaveBeenCalledTimes(1)
		expect(postMessage).toHaveBeenCalledWith({
			command: OpenSourceLocationProtocolCommands.openSourceLocation,
			identifier: '{function:navigableEntry}',
			relativePath: 'src/navigable.ts'
		})

		fireEvent.click(screen.getByRole('button', { name: 'Close' }))
		expect(postMessage).toHaveBeenCalledTimes(2)
		expect(postMessage).toHaveBeenLastCalledWith({
			command: EditorFileMethodReferenceViewProtocolCommands.closeActiveFile
		})
	})

	it('renders sections even when functionName is empty but data exists', () => {
		renderFreshApp()

		dispatchReferenceMessage({
			command: EditorFileMethodReferenceViewProtocolCommands.updateFirstFunction,
			functionName: '',
			intern: [
				{
					name: 'entryWithoutFunctionName',
					cpuTime: 1
				}
			]
		})

		expect(screen.getByText('entryWithoutFunctionName')).toBeTruthy()
	})
})
