import vscode from 'vscode'

export type QuickPickOptions = Map<string, {
	selectionCallback: () => void
}>

export default class QuickPick {
	vsCodeComponent: vscode.QuickPick<vscode.QuickPickItem>
	optionsWithCallBacks: QuickPickOptions

	constructor(options: QuickPickOptions, placeholder?: string) {
		this.optionsWithCallBacks = options

		const quickPick = vscode.window.createQuickPick()
		const labels: vscode.QuickPickItem[] = []
		for (const label of this.optionsWithCallBacks.keys()) {
			labels.push({
				label: label
			})
		}
		quickPick.items = labels
		quickPick.placeholder = placeholder
		quickPick.onDidChangeSelection(selection => {
			if (selection[0] && this.optionsWithCallBacks.has(selection[0].label)) {
				this.optionsWithCallBacks.get(selection[0].label)?.selectionCallback()
			}
			quickPick.hide()
		})
		quickPick.onDidHide(() => quickPick.dispose())
		this.vsCodeComponent = quickPick
	}

	show() {
		this.vsCodeComponent.show()
	}
}