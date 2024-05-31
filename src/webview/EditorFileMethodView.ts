import { PathIndex, SourceFileMetaData, SourceNodeIdentifier_string } from '@oaklean/profiler-core'
import { ISourceNodeIndex, SourceNodeIndexType } from '@oaklean/profiler-core/dist/src/model/index/SourceNodeIndex'
import { IPathIndex } from '@oaklean/profiler-core/dist/src/model/index/PathIndex'

import { ExtendedSensorValueType, SensorValueTypeNames, UnitPerSensorValue } from '../types/sensorValues'
import { SensorValueRepresentation } from '../types/sensorValueRepresentation'
import {calcOrReturnSensorValue} from '../helper/FormulaHelper'
import { EditorFileMethodViewProtocol_ChildToParent, EditorFileMethodViewCommands } from '../protocols/editorFileMethodViewProtocol'
import { MethodIdentifierHelper } from '../helper/MethodIdentifierHelper'

declare const acquireVsCodeApi: any

export const vscode = acquireVsCodeApi()

type ExtensionMessageEvent = {
	data: {
		methodList: SourceFileMetaData;
		pathIndex: PathIndex;
		command: EditorFileMethodViewCommands.createMethodList;
		sensorValueRepresentation: SensorValueRepresentation;
	};
}

window.addEventListener('DOMContentLoaded', () => {
	initMethodList()
})


export function initMethodList(){
	window.addEventListener('message', handleExtensionMessages)
	postToProvider({command: EditorFileMethodViewCommands.initMethods})
}

const handleExtensionMessages = (event: ExtensionMessageEvent) => {
	const { methodList, pathIndex, command, sensorValueRepresentation} = event.data
	switch (command){
		case EditorFileMethodViewCommands.createMethodList:
			createMethodTree(methodList, pathIndex as IPathIndex, sensorValueRepresentation)
			break
	}

}

function createMethodTree(methodList: SourceFileMetaData, pathIndex: IPathIndex,
	sensorValueRepresentation: SensorValueRepresentation) {
	const methodListElement = document.getElementById('method-list')
	if (!methodListElement){
		return
	}
	methodListElement.innerHTML = ''
	if (methodList === undefined){
		return
	}
	createHtmlFromTree(methodList, methodListElement, sensorValueRepresentation, pathIndex, undefined)
}

const postToProvider = (message: EditorFileMethodViewProtocol_ChildToParent) => {
	vscode.postMessage(message)
}

function createHtmlFromTree(methodList: SourceFileMetaData, parentElement: HTMLElement, 
	sensorValueRepresentation: SensorValueRepresentation, 
	pathIndex?: IPathIndex,
	sourceNodeIndex?: ISourceNodeIndex<SourceNodeIndexType>,
	parentIdentifiers?: Array<string>, padding = 0, 
	sourceIdentifierString?: string) {
	let selectedSensorValueType : ExtendedSensorValueType
	let identifierString : string
	const sourceNodeIndexArray: ISourceNodeIndex<SourceNodeIndexType>[] = []
	sourceIdentifierString = sourceIdentifierString ? sourceIdentifierString : ''
	if (pathIndex && pathIndex?.file !== undefined){
		const file = pathIndex.file
		if (file){
			for (const [indexKey, index] of Object.entries(file)) {
				if (sourceIdentifierString === ''){
					sourceIdentifierString = indexKey
				} else {
					sourceIdentifierString = sourceIdentifierString + '.' + indexKey
				}
				sourceNodeIndexArray.push(index)
			}
		}
	} else if (sourceNodeIndex){
		sourceNodeIndexArray.push(sourceNodeIndex)
	}
	if (methodList && sourceNodeIndexArray) {
		sourceNodeIndexArray.forEach((sourceNodeIndex) => {
			if (sourceNodeIndex.children){
				for (const key of Object.keys(sourceNodeIndex.children)) {
					const sourceNodeIndex_child = sourceNodeIndex.children[key]
					if (sourceNodeIndex_child.npiosc === true){
						continue
					}
					const identfierListContainer = document.createElement('div')
					parentElement.appendChild(identfierListContainer)
					const identifierContainer = document.createElement('div')
					identifierString = MethodIdentifierHelper.getShortenedIdentifier(key as SourceNodeIdentifier_string)
					const identifierID = sourceNodeIndex_child.id ? 
						identifierString + sourceNodeIndex_child.id : identifierString
					identifierContainer.dataset.identifier = identifierID
					identifierContainer.className = 'hoverable clickable identifierContainer '
					identifierContainer.dataset.sourceIdentifierString = key
					identfierListContainer.appendChild(identifierContainer)
					if (parentIdentifiers && parentIdentifiers.length > 0){
						parentIdentifiers.forEach((parentIdentifier) => {
							identifierContainer.dataset.parentIdentifier = parentIdentifier
							identifierContainer.classList.add(parentIdentifier)
						})
	
					}
					const identifier = document.createElement('span')
					identifier.innerHTML = identifierString
					identifier.className = 'identifierElement'
					identifierContainer.style.paddingLeft = `${padding}px`
					identifierContainer.appendChild(identifier)
					if (sensorValueRepresentation !== undefined && sourceNodeIndex_child.id){
						selectedSensorValueType = sensorValueRepresentation.selectedSensorValueType
						const sensorValues = methodList.functions[sourceNodeIndex_child.id].sensorValues
						let sensorValue
						if (selectedSensorValueType === SensorValueTypeNames.customFormula && sensorValues){
							const formula = sensorValueRepresentation.formula
							sensorValue = calcOrReturnSensorValue(sensorValues, selectedSensorValueType, formula)
						} else if (sensorValues !== undefined){
							sensorValue = sensorValues[selectedSensorValueType]? sensorValues[selectedSensorValueType] : '0'
						} else {
							sensorValue = '0'
						}
						sensorValue = parseFloat(parseFloat(sensorValue).toFixed(4)).toString()
						identifierContainer.setAttribute('data-selectedSensorValue', sensorValue)
						const sensorValueSpan = document.createElement('span')
						sensorValueSpan.textContent = ' ' + sensorValue + ' ' + UnitPerSensorValue[selectedSensorValueType]
						sensorValueSpan.className = 'sensorValue'
						identifierContainer.appendChild(sensorValueSpan)		
					}
					identifier.addEventListener('click', function() {
						const parentDiv = identifier.parentElement
						let sourceIdentifierString
						if (parentDiv){
							sourceIdentifierString = parentDiv.dataset.sourceIdentifierString
							let parentIdentifier = parentDiv.dataset.parentIdentifier
							while (parentIdentifier){
								const parentIdentifierElement = 
									document.querySelector(`[data-identifier='${parentIdentifier}']`) as HTMLElement
								if (parentIdentifierElement){
									sourceIdentifierString = parentIdentifierElement.dataset.sourceIdentifierString + '.' + sourceIdentifierString
									parentIdentifier = parentIdentifierElement.dataset.parentIdentifier
								} else {
									parentIdentifier = undefined
								}
	
							}
	
						}
						if (sourceIdentifierString !== null && sourceIdentifierString !== undefined){
							sourceIdentifierString = '{root}.' + sourceIdentifierString
							postToProvider({command: EditorFileMethodViewCommands.open, 
								identifier: sourceIdentifierString})
						}
					})
				
					if (sourceNodeIndex_child.children) {
						const icon = document.createElement('div')
						icon.className = 'codicon codicon-chevron-down icon'
						identifierContainer.prepend(icon)
						let targetIdentifier  = '' 
						icon.addEventListener('click', function(e) {
							if (e.target){
								const targetElement = e.target as HTMLElement
								if (targetElement.parentElement){
									targetIdentifier = targetElement.parentElement.dataset.identifier ? targetElement.parentElement.dataset.identifier : ''
								}
							}
							const identifierContainers = document
								.getElementsByClassName(targetIdentifier) as HTMLCollectionOf<HTMLElement>
	
							if (icon.classList.contains('codicon-chevron-down')){
								icon.classList.remove('codicon-chevron-down')
								icon.classList.add('codicon-chevron-right')
								for (let i = 0; i < identifierContainers.length; i++) {
									identifierContainers[i].style.display = 'none'
								}
							} else {
								icon.classList.remove('codicon-chevron-right')
								icon.classList.add('codicon-chevron-down')
								let storedIdentifier : string | undefined
								for (let i = 0; i < identifierContainers.length; i++) {
									if (identifierContainers[i].querySelector('.codicon-chevron-right')) {
										storedIdentifier = identifierContainers[i].dataset.identifier
									} 
							
									if (storedIdentifier && 
										identifierContainers[i].classList.contains(storedIdentifier)) {
										identifierContainers[i].style.display = 'none'
									} else {
										identifierContainers[i].style.display = 'flex'
									}
								}
							}
						})
						const newParentIdentifiers = 
						parentIdentifiers ? [...parentIdentifiers, identifierID] : [identifierID]
						createHtmlFromTree(methodList, identfierListContainer,
							sensorValueRepresentation, undefined, sourceNodeIndex_child,
							newParentIdentifiers, padding + 15, sourceIdentifierString)
					} else {
						identifierContainer.style.paddingLeft = `${padding + 8}px`
					}
				}
			}
			
		})
	}
}
