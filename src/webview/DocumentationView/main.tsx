import { createRoot } from 'react-dom/client'

import { App } from './App'

import { DOCUMENTATION_ROOT_ELEMENT_ID } from '../../constants/documentationUi'

window.addEventListener('DOMContentLoaded', () => {
	const container = document.getElementById(DOCUMENTATION_ROOT_ELEMENT_ID)
	if (container === null) {
		return
	}
	const root = createRoot(container)
	root.render(<App />)
})
