import { TextField } from '@vscode/webview-ui-toolkit'
import { provideVSCodeDesignSystem, allComponents } from '@vscode/webview-ui-toolkit'


import { FilterViewProtocol_ChildToParent } from '../protocols/filterViewProtocol'
import { FilterViewCommands } from '../types/filterViewCommands'

declare const acquireVsCodeApi: any

provideVSCodeDesignSystem().register(allComponents)

export const vscode = acquireVsCodeApi()

window.addEventListener('DOMContentLoaded', () => {
	initFilter()
})

export function initFilter(){
	const excludePath = document.getElementById('excludePath') as TextField | null
	const includePath = document.getElementById('includePath') as TextField	| null

	if (excludePath){
		excludePath?.addEventListener('input', (event) => {
			if (event.target){
				handleExcludedPathChange((event.target as HTMLInputElement).value)
			}

		})
	}
	if (includePath !== null){
		includePath.addEventListener('input', (event) => {
			if (event.target){
				handleIncludedPathChange((event.target as HTMLInputElement).value)
			}
			
		})
	}
    
}

function handleIncludedPathChange(includePath: string) {
	postToProvider({
		command: FilterViewCommands.includedPathChange,
		text: includePath
	})
}

function handleExcludedPathChange(excludedPath: string) {
	postToProvider({
		command: FilterViewCommands.excludedPathChange,
		text: excludedPath
	})
}


const postToProvider = (message: FilterViewProtocol_ChildToParent) => {
	vscode.postMessage(message)
}