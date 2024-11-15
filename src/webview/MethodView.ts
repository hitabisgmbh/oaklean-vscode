import globToRegExp from 'glob-to-regexp'
import { SensorValues, SourceNodeIdentifier_string } from '@oaklean/profiler-core'
import { provideVSCodeDesignSystem, allComponents } from '@vscode/webview-ui-toolkit'

import { SensorValueFormatHelper } from '../helper/SensorValueFormatHelper'
import { calcOrReturnSensorValue } from '../helper/FormulaHelper'
import { Method } from '../types/method'
import { MethodViewMessageTypes } from '../types/methodViewMessageTypes'
import { MethodViewCommands } from '../types/methodViewCommands'
import { SensorValueRepresentation, defaultSensorValueRepresentation } from '../types/sensorValueRepresentation'
import { ExtendedSensorValueType } from '../types/sensorValues'
import { SortDirection } from '../types/sortDirection'
import { MethodList } from '../model/MethodList'
import { FilterPaths } from '../types/FilterPaths'
import { SensorValueTypeNames } from '../types/sensorValues'
import { MethodViewProtocol_ChildToParent } from '../protocols/methodViewProtocol'
import { MethodIdentifierHelper } from '../helper/MethodIdentifierHelper'

declare const acquireVsCodeApi: any

provideVSCodeDesignSystem().register(allComponents)

export const vscode = acquireVsCodeApi()

type ExtensionMessageEvent = {
	data: {
		methodList: MethodList;
		sensorValueRepresentation: SensorValueRepresentation;
		type: MethodViewMessageTypes;
		filterPaths: FilterPaths;
		sortDirection: SortDirection;
		fileSensorValues: SensorValues;
	}
}

window.addEventListener('DOMContentLoaded', () => {
	initMethods()
})

export function initMethods() {
	window.addEventListener('message', handleExtensionMessages)
	postToProvider({ command: MethodViewCommands.initMethods })
}

const postToProvider = (message: MethodViewProtocol_ChildToParent) => {
	vscode.postMessage(message)
}

const handleExtensionMessages = (message: ExtensionMessageEvent) => {
	const { methodList, sensorValueRepresentation, type, filterPaths,
		sortDirection, fileSensorValues } = message.data
	let path: string
	let parts: string[]
	let filename: string
	let methods: Method[]
	let selectedSensorValueType: ExtendedSensorValueType = defaultSensorValueRepresentation().selectedSensorValueType
	const contentDiv = document.getElementById('content')
	const fileAndMethods = document.createElement('div')
	const fileDiv = document.createElement('div')
	const methodContainer = document.createElement('div')
	const icon = document.createElement('div')
	const totalSensorValueSpan = document.createElement('span')
	let fileName
	let firstFunctionCounter
	let filesTotalSensorValue = 0
	switch (type) {
		case MethodViewMessageTypes.displayMethods:
			fileName = document.createElement('span')
			path = methodList.path
			parts = path.split('/')
			filename = parts[parts.length - 1]
			fileName.className = 'fileName'
			methods = methodList.methods
			fileAndMethods.className = 'fileAndMethods'
			firstFunctionCounter = methods.length > 0 ? methods[0].functionCounter : ''
			fileAndMethods.setAttribute('data-firstFunctionCounter', firstFunctionCounter)
			fileAndMethods.setAttribute('data-filename', filename)
			fileAndMethods.setAttribute('data-fileSensorValues', JSON.stringify(fileSensorValues))
			fileAndMethods.setAttribute('data-path', path)
			fileName.textContent = filename + ' (' + methods.length + ')'
			fileDiv.className = 'files hoverable clickable'
			fileDiv.setAttribute('data-path', path)
			fileDiv.title = path
			icon.className = 'codicon codicon-chevron-down icon'
			fileDiv.appendChild(fileName)
			fileDiv.prepend(icon)
			methodContainer.className = 'methodContainer methods' + firstFunctionCounter
			if (contentDiv !== null) {
				contentDiv.appendChild(fileAndMethods)
				fileAndMethods.appendChild(fileDiv)
				fileAndMethods.appendChild(methodContainer)
				fileAndMethods.appendChild(fileDiv)
				fileAndMethods.appendChild(methodContainer)
			}
			if (sensorValueRepresentation !== undefined) {
				selectedSensorValueType = sensorValueRepresentation.selectedSensorValueType
			}

			fileDiv.addEventListener('click', function () {
				const methodElements = document.getElementsByClassName('methods' + firstFunctionCounter) as HTMLCollectionOf<HTMLElement>
				if (methodElements.length !== 0) {
					if (methodElements[0].style.display === 'none') {
						methodElements[0].style.display = 'block'
						icon.classList.remove('codicon-chevron-right')
						icon.classList.add('codicon-chevron-down')
					} else {
						methodElements[0].style.display = 'none'
						icon.classList.remove('codicon-chevron-down')
						icon.classList.add('codicon-chevron-right')
					}
				}
			})

			methods.forEach((method) => {
				const methodElement = document.createElement('p')
				let sensorValue
				if (selectedSensorValueType === SensorValueTypeNames.customFormula) {
					const formula = sensorValueRepresentation.formula
					sensorValue = calcOrReturnSensorValue(method.sensorValues, selectedSensorValueType, formula)
				} else {
					sensorValue = method.sensorValues[selectedSensorValueType] ? method.sensorValues[selectedSensorValueType] : '0'
				}
				filesTotalSensorValue += parseFloat(sensorValue)
				const shortenedFuntionName =
					MethodIdentifierHelper.getShortenedIdentifier(method.functionName as SourceNodeIdentifier_string)
				methodElement.className = 'hoverable methods methodElement clickable ' + filename
				methodElement.setAttribute('data-functionName', shortenedFuntionName)
				methodElement.setAttribute('data-functionCounter', String(method.functionCounter))
				methodElement.setAttribute('data-sensorvalues', JSON.stringify(method.sensorValues))
				methodElement.setAttribute('data-selected-sensorvalue', sensorValue)
				methodElement.setAttribute('data-identifier', method.identifier)
				const functionNameSpan = document.createElement('span')
				functionNameSpan.innerHTML = shortenedFuntionName
				functionNameSpan.className = 'functionName'

				sensorValue = parseFloat(sensorValue).toString()
				const sensorValueSpan = document.createElement('span')
				const formattedSensorValue = SensorValueFormatHelper.format(
					sensorValue,
					selectedSensorValueType
				)
				sensorValueSpan.textContent = ' ' + formattedSensorValue.value + ' ' + formattedSensorValue.unit
				sensorValueSpan.className = 'sensorValue'

				const functionCounterSpan = document.createElement('span')
				functionCounterSpan.textContent = ' ' + method.functionCounter
				functionCounterSpan.className = 'functionCounter'

				methodElement.appendChild(functionNameSpan)
				methodElement.appendChild(sensorValueSpan)
				methodElement.appendChild(functionCounterSpan)

				if (methodContainer !== null) {
					methodContainer.appendChild(methodElement)
					methodElement.addEventListener('click', function () {
						const identifier = methodElement.getAttribute('data-identifier')
						const filePath = fileDiv.getAttribute('data-path')
						if (identifier !== null && filePath !== null) {
							postToProvider({
								command: MethodViewCommands.openMethod,
								identifier,
								filePath
							})
						}
					})

				}
			})
			fileAndMethods.setAttribute('data-total-selected-sensorvalue', filesTotalSensorValue.toString())
			if (selectedSensorValueType && selectedSensorValueType === SensorValueTypeNames.customFormula) {
				totalSensorValueSpan.textContent = ' ' + filesTotalSensorValue
			} else {
				const formattedFilesTotalSensorValue = SensorValueFormatHelper.format(
					filesTotalSensorValue,
					selectedSensorValueType
				)
				totalSensorValueSpan.textContent = ' ' + formattedFilesTotalSensorValue.value + ' ' + formattedFilesTotalSensorValue.unit
			}
			totalSensorValueSpan.className = 'sensorValue'
			fileDiv.appendChild(totalSensorValueSpan)
			if (filterPaths !== undefined) {
				filterMethod(fileAndMethods, filterPaths)
			}

			break
		case MethodViewMessageTypes.sensorValueTypeChange:
			updateSensorValue(sensorValueRepresentation.selectedSensorValueType,
				sensorValueRepresentation.formula)
			break
		case MethodViewMessageTypes.filterPathChange:
			if (filterPaths !== undefined) {
				filterHTMLELements(filterPaths)
			}

			break
		case MethodViewMessageTypes.sortDirectionChange:
			changeSortDirection(sortDirection)
			break
		case MethodViewMessageTypes.clear:
			if (contentDiv !== null) {
				contentDiv.innerHTML = ''
			}
			break
	}
}

function changeSortDirection(sortDirection: SortDirection) {
	const files = Array.from(document.getElementsByClassName('fileAndMethods')) as HTMLElement[]
	files.sort((a, b) => {
		const aSelectedSensorValue = Number(a.getAttribute('data-total-selected-sensorvalue') || '0')
		const bSelectedSensorValue = Number(b.getAttribute('data-total-selected-sensorvalue') || '0')
		if (sortDirection === SortDirection.asc) {
			return aSelectedSensorValue - bSelectedSensorValue
		} else if (sortDirection === SortDirection.desc) {
			return bSelectedSensorValue - aSelectedSensorValue
		} else if (sortDirection === SortDirection.default) {
			const aFirstMethodNumber = Number(a.getAttribute('data-firstFunctionCounter') || '0')
			const bFirstMethodNumber = Number(b.getAttribute('data-firstFunctionCounter') || '0')
			return aFirstMethodNumber - bFirstMethodNumber
		} else {
			return 0
		}

	})

	const contentDiv = document.getElementById('content')
	if (contentDiv !== null) {
		contentDiv.innerHTML = ''
		files.forEach((file) => {
			contentDiv.appendChild(file)
			const methods = Array.from(file.getElementsByClassName('methods')) as HTMLElement[]
			methods.sort((a: HTMLElement, b: HTMLElement) => {
				const aSensorValue = Number(a.getAttribute('data-selected-sensorvalue') || '0')
				const bSensorValue = Number(b.getAttribute('data-selected-sensorvalue') || '0')
				if (sortDirection === SortDirection.asc) {
					return aSensorValue - bSensorValue
				} else if (sortDirection === SortDirection.desc) {
					return bSensorValue - aSensorValue
				} else if (sortDirection === SortDirection.default) {
					const aFirstMethodNumber = Number(a.getAttribute('data-functionCounter') || '0')
					const bFirstMethodNumber = Number(b.getAttribute('data-functionCounter') || '0')
					return aFirstMethodNumber - bFirstMethodNumber
				} else {
					return 0
				}
			})
			methods.forEach((method) => {
				method.parentElement?.appendChild(method)
			})
		})
	}


}

function updateSensorValue(selectedSensorValueType: ExtendedSensorValueType, formula: string | undefined) {
	const fileAndMethods = Array.from(document.getElementsByClassName('fileAndMethods')) as HTMLElement[]
	fileAndMethods.forEach((fileAndMethod) => {
		const methods = Array.from(fileAndMethod.getElementsByClassName('methods'))
		let filesTotalSensorValue = 0
		methods.forEach((method) => {
			const functionNameSpan = document.createElement('span')
			const functionName = method.getAttribute('data-functionName') || ''
			functionNameSpan.innerHTML = functionName
			functionNameSpan.className = 'functionName'

			const sensorValues = JSON.parse(method.getAttribute('data-sensorvalues') || '{}')
			const sensorValueSpan = document.createElement('span')
			sensorValueSpan.className = 'sensorValue'
			let sensorValue
			if (selectedSensorValueType === SensorValueTypeNames.customFormula && formula) {
				sensorValue = calcOrReturnSensorValue(
					sensorValues, selectedSensorValueType, formula)
				const formattedSensorValue = SensorValueFormatHelper.format(
					sensorValue,
					selectedSensorValueType
				)
				sensorValueSpan.textContent = ' ' + formattedSensorValue.value
			} else {
				sensorValue = sensorValues[selectedSensorValueType]
				const formattedSensorValue = SensorValueFormatHelper.format(
					sensorValue,
					selectedSensorValueType
				)
				sensorValueSpan.textContent = ' ' + formattedSensorValue.value + ' ' + formattedSensorValue.unit
			}
			if (sensorValue === undefined) {
				sensorValue = '0'
			}
			filesTotalSensorValue += parseFloat(sensorValue)

			const functionCounterSpan = document.createElement('span')
			functionCounterSpan.textContent = ' ' + method.getAttribute('data-functionCounter')
			functionCounterSpan.className = 'functionCounter'

			method.innerHTML = ''
			method.appendChild(functionNameSpan)
			method.appendChild(sensorValueSpan)
			method.appendChild(functionCounterSpan)

		})
		const fileDiv = fileAndMethod.getElementsByClassName('files')[0] as HTMLElement

		fileAndMethod.setAttribute('data-total-selected-sensorvalue', filesTotalSensorValue.toString())
		const fileDivSensorValueSpan = fileDiv.getElementsByClassName('sensorValue')[0]
		const formattedFilesTotalSensorValue = SensorValueFormatHelper.format(
			filesTotalSensorValue,
			selectedSensorValueType
		)
		if (selectedSensorValueType === SensorValueTypeNames.customFormula && formula) {
			fileDivSensorValueSpan.textContent = ' ' + formattedFilesTotalSensorValue.value
		} else {
			fileDivSensorValueSpan.textContent = ' ' + formattedFilesTotalSensorValue.value + ' ' + formattedFilesTotalSensorValue.unit
		}
	})
}

function filterHTMLELements(filterPaths: FilterPaths) {
	const files = Array.from(document.getElementsByClassName('fileAndMethods')) as HTMLElement[]
	files.forEach((file) => {
		filterMethod(file, filterPaths)
	})
}

function filterMethod(
	file: HTMLElement, filterPaths: FilterPaths) {
	const includedFilterPath = filterPaths.includedFilterPath
	const excludedFilterPath = filterPaths.excludedFilterPath
	const path = file.getAttribute('data-path') || ''
	let isIncluded = file.getAttribute('included')
	let isExcluded = file.getAttribute('excluded')
	if (includedFilterPath !== undefined && includedFilterPath !== '') {
		if (!checkPath(path, includedFilterPath)) {
			file.setAttribute('included', 'false')
			file.style.display = 'none'
			isIncluded = 'false'
			return
		} else if (isExcluded !== 'true') {
			file.setAttribute('included', 'true')
			isIncluded = 'true'
			file.style.display = 'block'
		}
	} else {
		file.setAttribute('included', 'true')
		isIncluded = 'true'
		file.style.display = 'block'
	}

	if (excludedFilterPath !== undefined && excludedFilterPath !== '') {
		if (checkPath(path, excludedFilterPath)) {
			file.setAttribute('excluded', 'true')
			isExcluded = 'true'
			file.style.display = 'none'
		} else if (isIncluded === 'true') {
			file.setAttribute('excluded', 'false')
			isExcluded = 'false'
			file.style.display = 'block'
		} else {
			file.style.display = 'none'
		}

	}

}
function checkPath(directory: string, filterPath: string) {
	if (filterPath && !(filterPath.endsWith('/*') || filterPath.endsWith('/'))) {
		filterPath = filterPath + '/*'
	} else if (filterPath && filterPath.endsWith('/')) {
		filterPath = filterPath + '*'
	}
	const normalizedDirectory = directory.startsWith('./') ? directory.substring(2) : directory
	const normalizedFilterPath = filterPath.startsWith('./') ? filterPath.substring(2) : filterPath
	const includeRe = globToRegExp(normalizedFilterPath, { extended: true })
	return includeRe.test(normalizedDirectory) || includeRe.test(normalizedDirectory + '/')
}