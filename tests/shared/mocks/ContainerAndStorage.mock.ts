import { Container } from '../../../src/container'
import { StorageChangeEvent, WorkspaceStorage } from '../../../src/storage'

export default class StorageAndContainerMock {

	container: Container
	listeners: Array<(event: StorageChangeEvent) => void> = []
	mockOnDidChange: any
	mockStore: Record<string, any>
	constructor() {
		this.mockOnDidChange = this.createOnDidChangeMock(this.listeners)
		this.mockStore = this.createMockStore(this.mockOnDidChange)
		this.createStorageMock(this.mockOnDidChange)
		this.container = this.createContainerMock(this.mockStore, this.mockOnDidChange, this.listeners)
	}

	createStorageMock = (mockOnDidChange: any) => {
		jest.mock('../../../src/storage', () => ({
			_onDidChange: mockOnDidChange,
			onDidChange: jest.fn((callback) => {
				mockOnDidChange.mockImplementation(callback)
			}),
		}))
	}

	setMockStore = (key: keyof WorkspaceStorage, value: any) => {
		this.mockStore[key] = value
	}

	createOnDidChangeMock = (listeners: ((event: StorageChangeEvent) => void)[]) => {
		return jest.fn().mockImplementation((listener: (event: StorageChangeEvent) => void) => {
			listeners.push(listener)

			return () => {
				const index = listeners.indexOf(listener)
				if (index > -1) {
					listeners.splice(index, 1)
				}
			}
		})
	}
	createMockStore = (mockOnDidChange: any): Record<string, any> => {
		return new Proxy({}, {
			set: function (target: Record<string, any>, key: string, value: any) {
				target[key] = value

				mockOnDidChange({ key: key, workspace: true })

				return true
			}
		})
	}

	mockEventHandler = {
		onTextDocumentOpen: jest.fn(),
		onTextEditorChange: jest.fn(),
		onProgramStructureTreeChange: jest.fn(),
		onReportLoaded: jest.fn(),
		onSelectedSensorValueTypeChange: jest.fn(),
		onToggleLineAnnotationsChange: jest.fn(),
		onReportPathChange: jest.fn(),
		onTextDocumentClose: jest.fn(),
		onTextDocumentChange: jest.fn(),
		onTextDocumentDidSave: jest.fn(),
		fireReportLoaded: jest.fn(),
		fireProgramStructureTreeChange: jest.fn(),
		onSortDirectionChange: jest.fn(),
	}


	createContainerMock = (mockStore: Record<string, any>, mockOnDidChange: any,
		listeners: ((event: StorageChangeEvent) => void)[]): Container => {
		const mockProfiles = [
			{ name: 'Profile 1', color: 'Red', measurement: 'profilerHits' },
			{ name: 'Profile 2', color: 'Blue', measurement: 'profilerHits' }
		]

		const mockContainer = {
			textDocumentController: {
				projectReport: {},
			},
			storage: {
				storeWorkspace: jest.fn().mockImplementation((key, value) => {
					mockStore[key] = value
					listeners.forEach(listener => {
						if (typeof listener === 'function') {
							listener({ key: key, workspace: true })
						}
					})
					return Promise.resolve()
				}),
				onDidChange: mockOnDidChange,
				getWorkspace: jest.fn((key) => {
					return mockStore[key]
				})
			},
			profileHelper: {
				get profiles() {
					return mockProfiles
				},
				get currentProfile() {
					return mockProfiles[0]
				}
			},
			eventHandler: this.mockEventHandler,
			context:{
				extensionMode: 1
			}
		}

		jest.mock('../../../src/container', () => {
			return {
				Container: jest.fn(() => mockContainer),
			}
		}, { virtual: true })

		// Importieren des gemockten Containers nach dem Mocking
		// Dies ist notwendig, um jest.mock Aufrufe zu aktivieren
		require('../../../src/container')

		// Rückgabe des gemockten Container-Objekts mit Typzuweisung
		return mockContainer as unknown as Container
	}
}
