import vscode, { EventEmitter, Event } from 'vscode'
import {
	NodeModule,
	NodeModuleIdentifier_string,
	UnifiedPath,
	SourceFileMetaDataTree,
	SourceFileMetaDataTreeType
} from '@oaklean/profiler-core'

import { Container } from '../container'
import { ReportLoadedEvent, SelectedSensorValueRepresentationChangeEvent, SortDirectionChangeEvent } from '../helper/EventHandler'
import { ValueRepresentationType } from '../types/valueRepresentationTypes'
import { calcOrReturnSensorValue } from '../helper/FormulaHelper'
import { SortDirection } from '../types/sortDirection'
import { SensorValueRepresentation, defaultSensorValueRepresentation } from '../types/sensorValueRepresentation'
import { SensorValueFormatHelper } from '../helper/SensorValueFormatHelper'


enum DisplayType {
	intern = 'intern',
	extern = 'extern',
}
class SourceFileMetaDataTreeNode extends vscode.TreeItem {
	type: DisplayType
	metaDataNode: SourceFileMetaDataTree<SourceFileMetaDataTreeType>
	sensorValueRepresentation: SensorValueRepresentation
	internalTotalValue: number
	modulesTotalValue: number
	displayedSensorValue = 0
	directory: UnifiedPath | undefined
	locallyTotalValue: number | undefined
	constructor(
		label: string,
		type: DisplayType,
		parentNode: SourceFileMetaDataTree<SourceFileMetaDataTreeType>,
		metaDataNode: SourceFileMetaDataTree<SourceFileMetaDataTreeType>,
		sensorValueRepresentation: SensorValueRepresentation,
		internalTotalValue: number,
		modulesTotalValue: number,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		directory: UnifiedPath | undefined,
		public readonly file?: UnifiedPath,
		locallyTotalValue?: number | undefined
	) {
		super(label, collapsibleState)
		this.type = type
		this.metaDataNode = metaDataNode
		this.tooltip = label
		this.file = file
		this.sensorValueRepresentation = sensorValueRepresentation
		this.internalTotalValue = internalTotalValue
		this.modulesTotalValue = modulesTotalValue
		this.directory = directory
		let proportion = 0
		this.locallyTotalValue = locallyTotalValue
		if (this.sensorValueRepresentation.selectedSensorValueType === undefined) {
			this.sensorValueRepresentation.selectedSensorValueType = 'aggregatedCPUTime'
		}
		if (this.sensorValueRepresentation.selectedValueRepresentation === undefined ||
			this.sensorValueRepresentation.selectedValueRepresentation === ValueRepresentationType.absolute) {
			if (type === DisplayType.extern) {
				let childModulesTotal = 0
				childModulesTotal = this.calculateModulesTotal(metaDataNode)

				proportion = childModulesTotal
			} else {
				proportion = calcOrReturnSensorValue(
					metaDataNode.aggregatedInternSourceMetaData.total.sensorValues,
					this.sensorValueRepresentation
				)
			}
			const formattedValue = SensorValueFormatHelper.format(
				proportion,
				this.sensorValueRepresentation.selectedSensorValueType
			)
			this.displayedSensorValue = proportion
			this.description = formattedValue.value + ' ' + formattedValue.unit
		} else if (this.sensorValueRepresentation.selectedValueRepresentation
			=== ValueRepresentationType.locallyRelative) {
			if (type === DisplayType.extern) {
				const modulesTotalValue = this.calculateModulesTotal(metaDataNode)
				if (locallyTotalValue) {
					proportion = modulesTotalValue / locallyTotalValue * 100
				} else {
					let internTotal = 0
					internTotal = calcOrReturnSensorValue(
						metaDataNode.aggregatedInternSourceMetaData.total.sensorValues,
						this.sensorValueRepresentation
					)

					proportion = modulesTotalValue / (internTotal + modulesTotalValue) * 100
				}
			} else {
				let total = 0
				if (locallyTotalValue) {
					total = locallyTotalValue
				} else {
					total += this.calculateModulesTotal(parentNode)
					if (metaDataNode.type !== SourceFileMetaDataTreeType.Module) {
						total += calcOrReturnSensorValue(
							parentNode.aggregatedInternSourceMetaData.total.sensorValues,
							this.sensorValueRepresentation
						)
					}
				}
				let internalTotalValue = 0
				internalTotalValue = calcOrReturnSensorValue(
					metaDataNode.aggregatedInternSourceMetaData.total.sensorValues,
					this.sensorValueRepresentation
				)
				proportion = internalTotalValue / total * 100
			}
			if (isNaN(proportion)) {
				proportion = 0
			}
			this.displayedSensorValue = proportion
			this.description = proportion.toFixed(1) + '%'
		} else if (this.sensorValueRepresentation.selectedValueRepresentation
			=== ValueRepresentationType.totalRelative) {
			if (type === DisplayType.extern) {
				const childModulesTotal = this.calculateModulesTotal(metaDataNode)

				proportion = childModulesTotal / (modulesTotalValue + internalTotalValue) * 100
			} else {
				const result = calcOrReturnSensorValue(
					metaDataNode.aggregatedInternSourceMetaData.total.sensorValues,
					this.sensorValueRepresentation
				)
				proportion = result / (modulesTotalValue + internalTotalValue) * 100
			}
			if (isNaN(proportion)) {
				proportion = 0
			}
			this.displayedSensorValue = proportion
			this.description = proportion.toFixed(1) + '%'
		}
		{
			if (this.file) {
				const file = this.file.toPlatformString()
				this.command = this.createCommand(label, file)
			}
		}
	}

	private createCommand(label: string, file: string): vscode.Command {
		return {
			command: 'oaklean.openDynamicFile',
			title: label,
			arguments: [file]
		}
	}

	calculateModulesTotal(
		node: SourceFileMetaDataTree<SourceFileMetaDataTreeType>
	): number {
		let total = 0
		for (const externChild of node.externChildren.values()) {
			total += calcOrReturnSensorValue(
				externChild.aggregatedInternSourceMetaData.total.sensorValues,
				this.sensorValueRepresentation
			)
		}
		return total

	}
}

export class SourceFileMetaDataTreeProvider implements vscode.TreeDataProvider<SourceFileMetaDataTreeNode> {
	private _disposable: vscode.Disposable
	
	container: Container
	_originalSourceFileMetaDataTree: SourceFileMetaDataTree<SourceFileMetaDataTreeType> | undefined
	sourceFileMetaDataTree: SourceFileMetaDataTree<SourceFileMetaDataTreeType> | undefined
	sensorValueRepresentation: SensorValueRepresentation
	modulesTotalValue = 0
	includedFilterPath: string | undefined
	excludedFilterPath: string | undefined
	sortDirection = 'default'
	private changeEvent = new EventEmitter<void>()
	relativeRootDir: UnifiedPath | undefined
	public get onDidChangeTreeData(): Event<void> {
		return this.changeEvent.event
	}

	constructor(container: Container) {
		this.container = container
		this.loadFromProjectReport()
		const sensorValueRepresentation = this.container.storage.getWorkspace('sensorValueRepresentation') as SensorValueRepresentation
		if (sensorValueRepresentation === undefined) {
			this.sensorValueRepresentation = defaultSensorValueRepresentation()
		} else {
			this.sensorValueRepresentation = sensorValueRepresentation
		}

		this._disposable = vscode.Disposable.from(
			this.container.eventHandler.onReportLoaded(this.reportLoaded.bind(this)),
			this.container.eventHandler.onSelectedSensorValueTypeChange(this.selectedSensorValueTypeChanged.bind(this)),
			this.container.eventHandler.onSortDirectionChange(this.sortDirectionChanged.bind(this)),
			this.container.eventHandler.onFilterPathChange(this.applyFilter.bind(this))
		)
	}

	dispose() {
		this._disposable.dispose()
	}

	sortDirectionChanged(event: SortDirectionChangeEvent) {
		this.changeSortDirection(event.sortDirection)
	}

	selectedSensorValueTypeChanged(event: SelectedSensorValueRepresentationChangeEvent) {
		this.sensorValueRepresentation = event.sensorValueRepresentation
		this.loadFromProjectReport()
	}

	valueRepresentation(
		sensorValueRepresentation: SensorValueRepresentation
	): void {
		const oldRepresentation = this.sensorValueRepresentation
		const oldModulesTotalValue = this.modulesTotalValue
		this.sensorValueRepresentation = sensorValueRepresentation
		let modulesTotalValue = 0
		if (
			this.sourceFileMetaDataTree &&
			this.sourceFileMetaDataTree.type === 'Root' &&
			this.sensorValueRepresentation.selectedSensorValueType !== undefined
		) {
			for (const externChild of this.sourceFileMetaDataTree.externChildren.values()) {
				try {
					const value = calcOrReturnSensorValue(
						externChild.aggregatedInternSourceMetaData.total.sensorValues,
						this.sensorValueRepresentation
					)
					modulesTotalValue += value
				} catch (e) {
					this.sensorValueRepresentation = oldRepresentation
					modulesTotalValue = oldModulesTotalValue
				}

				this.modulesTotalValue = modulesTotalValue
			}
			this.rerender()
		}
	}

	loadFromProjectReport() {
		const projectReport = this.container.textDocumentController.projectReport
		if (projectReport) {
			this.relativeRootDir = projectReport.relativeRootDir
			this._originalSourceFileMetaDataTree = SourceFileMetaDataTree.fromProjectReport(projectReport)
			this.applyFilter()
		}
	}

	reportLoaded(event: ReportLoadedEvent) {
		this.loadFromProjectReport()
	}

	getTreeItem(element: SourceFileMetaDataTreeNode): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element
	}

	changeSortDirection(sortDirection: string) {
		this.sortDirection = sortDirection
		this.rerender()
	}

	applyFilter() {
		const includedFilterPath = this.container.storage.getWorkspace('includedFilterPath') as string
		const excludedFilterPath = this.container.storage.getWorkspace('excludedFilterPath') as string
		if (this.container.textDocumentController.projectReport !== undefined) {
			this.sourceFileMetaDataTree = this._originalSourceFileMetaDataTree?.filter(
				this.container.textDocumentController.projectReport.asSourceNodeGraph(),
				// true,
				includedFilterPath,
				excludedFilterPath
			).node || undefined
			this.valueRepresentation(this.sensorValueRepresentation)
			this.rerender()
		}
	}

	rerender() {
		this.changeEvent.fire()
	}

	getChildren(element?: SourceFileMetaDataTreeNode | undefined): vscode.ProviderResult<SourceFileMetaDataTreeNode[]> {
		if (!this.sourceFileMetaDataTree) {
			return Promise.resolve([])
		}
		const node = element ? element.metaDataNode : this.sourceFileMetaDataTree
		const result: SourceFileMetaDataTreeNode[] = []
		const displayAsIntern = !element || element.type === DisplayType.intern
		const children = displayAsIntern ? node.internChildren : node.externChildren
		let internalTotalValue = 0
		let locallyTotalValue
		if (this.sensorValueRepresentation.selectedSensorValueType) {
			internalTotalValue = calcOrReturnSensorValue(
				this.sourceFileMetaDataTree.aggregatedInternSourceMetaData.total.sensorValues,
				this.sensorValueRepresentation)
		}

		for (const [filePathPart, childNode] of children.entries()) {
			const isEmpty =
				childNode.internChildren.size + childNode.externChildren.size === 0
			let workspaceFilePath
			const nodeModule =
				childNode.type === 'Module'
					? NodeModule.fromIdentifier(filePathPart as NodeModuleIdentifier_string)
					: undefined
			const directory = element
				? element.directory?.join(nodeModule?.name || filePathPart)
				: new UnifiedPath(filePathPart)
			if (childNode.type === 'File') {
				let filePath
				if (element) {
					filePath = element.directory?.join(filePathPart)
				} else {
					if (node.filePath) {
						filePath = (node as SourceFileMetaDataTree<SourceFileMetaDataTreeType.File>).
							filePath.join(filePathPart)
					} else {
						filePath = directory
					}
				}
				if (!filePath) {
					workspaceFilePath = undefined
				} else {
					workspaceFilePath = new UnifiedPath(filePath.toString())
				}
			} else {
				if (isEmpty) {
					continue
				}
			}

			result.push(
				new SourceFileMetaDataTreeNode(
					filePathPart,
					DisplayType.intern,
					node,
					childNode,
					this.sensorValueRepresentation,
					internalTotalValue,
					this.modulesTotalValue,
					isEmpty
						? vscode.TreeItemCollapsibleState.None
						: vscode.TreeItemCollapsibleState.Collapsed,
					directory,
					workspaceFilePath,
					locallyTotalValue
				)
			)
		}
		if (displayAsIntern) {
			if (node.externChildren.size > 0) {
				const path = new UnifiedPath('./node_modules')
				result.push(
					new SourceFileMetaDataTreeNode(
						'node_modules',
						DisplayType.extern,
						node,
						node,
						this.sensorValueRepresentation,
						internalTotalValue,
						this.modulesTotalValue,
						vscode.TreeItemCollapsibleState.Collapsed,
						path,
						undefined,
						locallyTotalValue
					)
				)
			}
		}

		if (this.sortDirection === SortDirection.asc) {
			result.sort((a, b) => {
				const displayedSensorValueA = a.displayedSensorValue
				const displayedSensorValueB = b.displayedSensorValue
				return displayedSensorValueA - displayedSensorValueB
			})
		} else if (this.sortDirection === SortDirection.desc) {
			result.sort((a, b) => {
				const displayedSensorValueA = a.displayedSensorValue
				const displayedSensorValueB = b.displayedSensorValue
				return displayedSensorValueB - displayedSensorValueA
			})
		}
		return Promise.resolve(result)
	}
}
