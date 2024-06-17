import vscode from 'vscode'

export type QuickPickOptions = Map<string, {
	selectionCallback: () => void
}>

export default class QuickPick {
	vsCodeComponent: vscode.QuickPick<vscode.QuickPickItem> | undefined
	optionsWithCallBacks: QuickPickOptions

	constructor(options: QuickPickOptions) {
		this.optionsWithCallBacks = options

		const quickPick = vscode.window.createQuickPick()
		const labels: vscode.QuickPickItem[] = []
		for (const label of this.optionsWithCallBacks.keys()) {
			labels.push({
				label: label
			})
		}
		if (labels.length === 0) {
			quickPick.hide()

			return
		}
		quickPick.items = labels
		quickPick.placeholder = `Select Project Report (${labels.length} Report${labels.length > 1 ? 's' : ''} Available)`
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
		if (!this.vsCodeComponent) {
			return
		}
		this.vsCodeComponent.show()
	}
}