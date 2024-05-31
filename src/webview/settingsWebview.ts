import { Button, Dropdown, provideVSCodeDesignSystem, allComponents } from '@vscode/webview-ui-toolkit'

import { Profile } from '../types/profile'
import { ExtendedSensorValueType } from '../types/sensorValues'
import { ERROR_INPUT_MISSING, ERROR_NO_TITLE } from '../constants/infoMessages'
import { Color } from '../types/color'
import { SettingsWebViewProtocol_ChildToParent, SettingsWebViewProtocol_ParentToChild } from '../protocols/settingsWebviewProtocol'

const ID_PROFILE_DROPDOWN = 'profileDropdown'
const ID_TITLE = 'title'
const ID_COLOR = 'color'
const ID_MEASUREMENT = 'measurement'
const ID_TITLE2 = 'title2'
const ID_COLOR2 = 'color2'
const ID_MEASUREMENT2 = 'measurement2'
const ID_FORMULA_TEXT_FIELD = 'customFormulaInput'
const ID_FORMULA_TEXT_FIELD2 = 'customFormulaInput2'
const ID_FORMULA_DESCRIPTION = 'customFormulaDescription'
const ID_FORMULA_DESCRIPTION2 = 'customFormulaDescription2'
const ID_FORMULA_LABEL = 'customFormulaLabel'
const ID_FORMULA_LABEL2 = 'customFormulaLabel2'
const ID_SAVE_CHANGES_BUTTON = 'saveChangesButton'
const ID_SAVE_NEW_PROFILE_BUTTON = 'saveNewProfileButton'
const ID_DELETE_BUTTON = 'deleteButton'

declare const acquireVsCodeApi: any

provideVSCodeDesignSystem().register(allComponents)

export const vscode = acquireVsCodeApi()

function postToWebViewPanel(command: SettingsWebViewProtocol_ChildToParent) {
	vscode.postMessage(command)
}

window.addEventListener('load', main)
export function main() {
	const profileDropdown = document.getElementById(ID_PROFILE_DROPDOWN) as Dropdown
	if (profileDropdown !== null && profileDropdown !== undefined) {
		profileDropdown.addEventListener('click', handleProfileChange)
	}

	const saveChangesButton = document.getElementById(ID_SAVE_CHANGES_BUTTON) as Button
	if (saveChangesButton !== null && saveChangesButton !== undefined) {
		saveChangesButton.addEventListener('click', handleSaveButtonClick)
	}

	const saveNewProfileButton = document.getElementById(ID_SAVE_NEW_PROFILE_BUTTON) as Button
	if (saveNewProfileButton !== null && saveNewProfileButton !== undefined) {
		saveNewProfileButton.addEventListener('click', handleAddProfileButtonClick)
	}

	const profileDropdownStart = document.getElementById(ID_PROFILE_DROPDOWN) as Dropdown
	const profiles: Profile[] = []

	const deleteButton = document.getElementById(ID_DELETE_BUTTON) as Button
	if (deleteButton !== null && deleteButton !== undefined) {
		deleteButton.addEventListener('click', handleDeleteButtonClick)
	}

	const measurementDropdown = document.getElementById(ID_MEASUREMENT) as Dropdown
	const measurementDropdown2 = document.getElementById(ID_MEASUREMENT2) as Dropdown
	const customFormulaInput = document.getElementById(ID_FORMULA_TEXT_FIELD) as HTMLInputElement
	if (customFormulaInput !== null && customFormulaInput !== undefined) {
		customFormulaInput.addEventListener('input', handleFormulaInputChange)
	}
	if (measurementDropdown2 !== null && measurementDropdown2 !== undefined) {
		measurementDropdown2.addEventListener('change', handleCustomFormula)
	}
	if (measurementDropdown !== null && measurementDropdown !== undefined) {
		measurementDropdown.addEventListener('change', handleCustomFormula)
	}
	
	if (profileDropdownStart !== null && profileDropdownStart !== undefined) {
		profileDropdownStart.addEventListener('change', (event) => {
			const selectedProfileName = (event.target as HTMLInputElement)?.value
			const selectedProfile = profiles.find(profile => profile.name === selectedProfileName)			
			const colorElement = document.getElementById(ID_COLOR) as HTMLInputElement
			const measurementElement = document.getElementById(ID_MEASUREMENT) as HTMLInputElement
			if (colorElement && selectedProfile) {
				colorElement.value = selectedProfile.color
			}
			if (measurementElement && selectedProfile) {
				measurementElement.value = selectedProfile.measurement
			}
		})
	}

	window.addEventListener('message', (event) => {
		const message = event.data as SettingsWebViewProtocol_ParentToChild
		switch (message.command) {
			case 'updateProfile':
				displayProfile(message.profile)
				break
			case 'loadProfiles':
				handleLoadProfiles(message.profile, message.profiles)
				break
			case 'clearInput':
				handleClearInput()				
				break
		}
	})
}

function handleClearInput() {
	const titleInput = document.getElementById(ID_TITLE2) as HTMLInputElement 
	const contentInput = document.getElementById(ID_COLOR2) as Dropdown 
	const measurementInput = document.getElementById(ID_MEASUREMENT2) as Dropdown 
	const customFormulaInput = document.getElementById(ID_FORMULA_TEXT_FIELD2) as HTMLInputElement
	const customFormulaDescription = document.getElementById(ID_FORMULA_DESCRIPTION2) as HTMLInputElement
	const customFormulaLabel = document.getElementById(ID_FORMULA_LABEL2) as HTMLLabelElement	
	titleInput.value = ''
	if (contentInput.options.length > 0) {
		contentInput.value = contentInput.options[0].value
	}

	if (measurementInput.options.length > 0) {
		measurementInput.value = measurementInput.options[0].value
	}
	customFormulaInput.value = ''
	customFormulaInput.style.display = 'none'
	customFormulaDescription.style.display = 'none'
	customFormulaLabel.style.display = 'none'
}

function handleLoadProfiles(profile: Profile | undefined, profiles: Profile[]) {
	const dropdown = document.getElementById(ID_PROFILE_DROPDOWN) as HTMLSelectElement
	const title = document.getElementById(ID_TITLE) as HTMLInputElement
	const color = document.getElementById(ID_COLOR) as Dropdown
	const measurement = document.getElementById(ID_MEASUREMENT) as Dropdown
	const customFormula = document.getElementById(ID_FORMULA_TEXT_FIELD) as HTMLInputElement
	const customFormulaDescription = document.getElementById(ID_FORMULA_DESCRIPTION) as HTMLInputElement
	const customFormulaLabel = document.getElementById(ID_FORMULA_LABEL) as HTMLLabelElement

	dropdown.innerHTML = ''

	profiles.forEach(p => {
		const option = document.createElement('option')
		option.value = p.name
		option.text = p.name
		dropdown.appendChild(option)
	})

	const setValues = (selectedProfile: Profile) => {
		dropdown.value = selectedProfile.name
		title.value = selectedProfile.name
		color.value = selectedProfile.color
		measurement.value = selectedProfile.measurement

		if (measurement.value === 'customFormula') {
			customFormula.value = '' 
			customFormula.value = selectedProfile.formula || '' // Use the formula if it exists, otherwise clear the field
			customFormula.style.display = 'block'
			customFormulaDescription.style.display = 'block'
			customFormulaLabel.style.display = 'block'
		} else {
			customFormula.style.display = 'none'
			customFormulaDescription.style.display = 'none'
			customFormulaLabel.style.display = 'none'
		}
	}

	if (profile !== undefined) {
		setValues(profile)
	} else if (profiles.length > 0) {
		setValues(profiles[0])
	}
}

function handleProfileChange() {
	const selectedProfileName = (document.getElementById(ID_PROFILE_DROPDOWN) as Dropdown).value
	
	postToWebViewPanel({
		command: 'selectProfile',
		profileName: selectedProfileName
	})
}

function handleSaveButtonClick() {
	const nameInput = document.getElementById(ID_TITLE) as HTMLInputElement
	const colorInput = document.getElementById(ID_COLOR) as Dropdown
	const measurementInput = document.getElementById(ID_MEASUREMENT) as Dropdown
	const formulaInput = document.getElementById(ID_FORMULA_TEXT_FIELD) as HTMLInputElement

	handleDefaultValues()
	if (!nameInput || !colorInput || !measurementInput) {
		vscode.window.showErrorMessage(ERROR_INPUT_MISSING)
		return
	}

	const profile: Profile = {
		name: nameInput.value,
		color: colorInput.value as Color,
		measurement: measurementInput.value as ExtendedSensorValueType
	}

	if (profile.measurement === 'customFormula' && formulaInput.style.display === 'block') {
		profile.formula = formulaInput.value
	}
	postToWebViewPanel({
		command: 'updateProfile',
		profile: profile
	})
}

export function handleAddProfileButtonClick() {
	const nameInput = document.getElementById(ID_TITLE2) as HTMLInputElement
	const colorInput = document.getElementById(ID_COLOR2) as HTMLInputElement
	const measurementInput = document.getElementById(ID_MEASUREMENT2) as HTMLInputElement
	const formulaInput = document.getElementById(ID_FORMULA_TEXT_FIELD2) as HTMLInputElement

	if (!nameInput || !colorInput || !measurementInput) {
		vscode.window.showErrorMessage(ERROR_INPUT_MISSING)
		return
	}

	const profile: Profile = {
		name: nameInput.value,
		color: colorInput.value as Color,
		measurement: measurementInput.value as ExtendedSensorValueType,
	}

	if (measurementInput.value === 'customFormula' && formulaInput.style.display === 'block') {
		profile.formula = formulaInput.value
	}

	if (profile.name && profile.color && profile.measurement) {
		postToWebViewPanel({
			command: 'addProfile',
			profile: profile
		})
	}
}

function handleDeleteButtonClick() {
	let name
	const nameInput = document.getElementById(ID_TITLE) as HTMLInputElement
	handleDefaultValues()
	if (nameInput !== null && nameInput !== undefined) {
		name = nameInput.value
	} else {
		vscode.window.showErrorMessage(ERROR_NO_TITLE)
		return
	}
	postToWebViewPanel({
		command: 'deleteProfile',
		profileName: name
	})
}

function displayProfile(profile: Profile) {
	const textField = document.getElementById(ID_TITLE) as HTMLTextAreaElement | null
	const color = document.getElementById(ID_COLOR) as HTMLInputElement
	const measurement = document.getElementById(ID_MEASUREMENT) as HTMLSelectElement
	const customFormulaInput = document.getElementById(ID_FORMULA_TEXT_FIELD) as HTMLInputElement
	const customFormulaDescription = document.getElementById(ID_FORMULA_DESCRIPTION) as HTMLInputElement

	if (textField === null || textField === undefined) {
		vscode.window.showErrorMessage(ERROR_NO_TITLE)
		return
	}

	textField.value = profile.name
	color.value = profile.color
	measurement.value = profile.measurement

	const isCustomFormula = measurement.value === 'customFormula'
	customFormulaInput.style.display = isCustomFormula ? 'block' : 'none'
	customFormulaDescription.style.display = isCustomFormula ? 'block' : 'none'

	if (isCustomFormula !== null && isCustomFormula !== undefined) {
		customFormulaInput.value = profile.formula || '' // Use the formula if it exists, otherwise clear the field
	}
}

function handleCustomFormula() {
	const toggleCustomFormulaDisplay = (
		measurementDropdownId: string, 
		formulaInputId: string, 
		formulaDescriptionId: string, 
		formulaLabel: string) => {
		const measurementDropdown = document.getElementById(measurementDropdownId) as HTMLSelectElement
		const customFormulaInput = document.getElementById(formulaInputId) as HTMLInputElement
		const customFormulaDescription = document.getElementById(formulaDescriptionId) as HTMLInputElement
		const customFormulaLabel = document.getElementById(formulaLabel) as HTMLLabelElement

		const isCustomFormula = measurementDropdown.value === 'customFormula'
		let displayStyle: string
		if (isCustomFormula) {
			displayStyle = 'block'
			customFormulaInput.value = ''
		} else {
			displayStyle = 'none'
		}

		customFormulaInput.style.display = displayStyle
		customFormulaDescription.style.display = displayStyle
		customFormulaLabel.style.display = displayStyle
	}

	toggleCustomFormulaDisplay(ID_MEASUREMENT, ID_FORMULA_TEXT_FIELD, ID_FORMULA_DESCRIPTION, ID_FORMULA_LABEL )
	toggleCustomFormulaDisplay(ID_MEASUREMENT2, ID_FORMULA_TEXT_FIELD2, ID_FORMULA_DESCRIPTION2, ID_FORMULA_LABEL2)
}

export function handleFormulaInputChange() {
	const dropdownValue = document.getElementById(ID_MEASUREMENT) as Dropdown
	const customFormulaInput = document.getElementById(ID_FORMULA_TEXT_FIELD) as HTMLInputElement

	// Get the profile from the workspace storage
	const profile: Profile = this.container.storage.getWorkspace(`profile.${dropdownValue.value}`)

	// If the profile exists, update the formula
	if (profile !== undefined && profile !== null) {
		profile.formula = customFormulaInput.value

		// Save the updated profile to the workspace storage
		this.container.storage.storeWorkspace(`profile.${dropdownValue.value}`, profile)
	} else {
		vscode.window.showErrorMessage(ERROR_INPUT_MISSING)
		return
	}
}

function handleDefaultValues() {
	const nameInput = document.getElementById(ID_TITLE) as HTMLInputElement
	if (nameInput.value === 'default' || nameInput.value === 'Default') {
		vscode.window.showErrorMessage('Cannot save a profile with the name "default" or "Default"')
		return
	}
}

