import vscode, { EventEmitter, Event, Uri } from 'vscode'
import {
	NodeModule,
	NodeModuleIdentifier_string,
	UnifiedPath,
	SourceFileMetaDataTree,
	SourceFileMetaDataTreeType
} from '@oaklean/profiler-core'

import WorkspaceUtils from '../helper/WorkspaceUtils'
import { Container } from '../container'
import { ReportLoadedEvent, SelectedSensorValueRepresentationChangeEvent, SortDirectionChangeEvent } from '../helper/EventHandler'
import { ValueRepresentationType } from '../types/valueRepresentationTypes'
import { ExtendedSensorValueType, UnitPerSensorValue } from '../types/sensorValues'
import { DirectoryTreeNode } from '../model/DirectoryTreeNode'
import { calcOrReturnSensorValue } from '../helper/FormulaHelper'
import { SortDirection } from '../types/sortDirection'
import { SensorValueRepresentation, defaultSensorValueRepresentation } from '../types/sensorValueRepresentation'


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
	includedFilterPath: string
	excludedFilterPath: string
	directoryTreeNode: DirectoryTreeNode | undefined
	constructor(
		label: string,
		type: DisplayType,
		parentNode: SourceFileMetaDataTree<SourceFileMetaDataTreeType>,
		metaDataNode: SourceFileMetaDataTree<SourceFileMetaDataTreeType>,
		sensorValueRepresentation: SensorValueRepresentation,
		internalTotalValue: number,
		modulesTotalValue: number,
		includedFilterPath: string,
		excludedFilterPath: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		directory: UnifiedPath | undefined,
		public readonly file?: UnifiedPath,
		directoryTreeNode?: DirectoryTreeNode | undefined
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
		this.includedFilterPath = includedFilterPath
		this.excludedFilterPath = excludedFilterPath
		this.directoryTreeNode = directoryTreeNode
		if (this.sensorValueRepresentation.selectedSensorValueType === undefined){
			this.sensorValueRepresentation.selectedSensorValueType = 'aggregatedCPUTime'
		}
		if (this.sensorValueRepresentation.selectedValueRepresentation === undefined || 
			this.sensorValueRepresentation.selectedValueRepresentation === ValueRepresentationType.absolute){
			if (type === DisplayType.extern) {
				let childModulesTotal = 0
				if (this.directoryTreeNode) {
					for (const externChild of this.directoryTreeNode.children.values()) {
						childModulesTotal += calcOrReturnSensorValue(externChild.measurement, 
							this.sensorValueRepresentation.selectedSensorValueType, 
							this.sensorValueRepresentation.formula)
					}	
				} else {
					childModulesTotal = this.calculateModulesTotal(metaDataNode, 
						this.sensorValueRepresentation.selectedSensorValueType, 
						this.sensorValueRepresentation.formula)
				}

				proportion = childModulesTotal
			} else {
				proportion = calcOrReturnSensorValue(metaDataNode.aggregatedInternSourceMetaData
					.total.sensorValues,
				this.sensorValueRepresentation.selectedSensorValueType, 
				this.sensorValueRepresentation.formula)
			}
			this.displayedSensorValue = proportion
			this.description = proportion + ' ' + UnitPerSensorValue[this.sensorValueRepresentation.selectedSensorValueType]
		} else if (this.sensorValueRepresentation.selectedValueRepresentation
			=== ValueRepresentationType.locallyRelative){
			if (type === DisplayType.extern) {
				let internTotal = 0
				const modulesTotalValue = this.calculateModulesTotal(metaDataNode, 
					this.sensorValueRepresentation.selectedSensorValueType, this.sensorValueRepresentation.formula)
				internTotal = calcOrReturnSensorValue(metaDataNode.aggregatedInternSourceMetaData
					.total.sensorValues, 
				this.sensorValueRepresentation.selectedSensorValueType, this.sensorValueRepresentation.formula)

				proportion = modulesTotalValue / (internTotal + modulesTotalValue) * 100
			} else {
				let total = this.calculateModulesTotal(parentNode, 
					this.sensorValueRepresentation.selectedSensorValueType, this.sensorValueRepresentation.formula)
				let result = 0

				if (metaDataNode.type !== SourceFileMetaDataTreeType.Module) {
					total += calcOrReturnSensorValue(parentNode.aggregatedInternSourceMetaData
						.total.sensorValues, 
					this.sensorValueRepresentation.selectedSensorValueType, this.sensorValueRepresentation.formula)
				}

				result = calcOrReturnSensorValue(metaDataNode.aggregatedInternSourceMetaData
					.total.sensorValues, 
				this.sensorValueRepresentation.selectedSensorValueType, this.sensorValueRepresentation.formula)
				proportion = result / total * 100
			}
			this.displayedSensorValue = proportion
			this.description = proportion.toFixed(1) + '%'
		} else if (this.sensorValueRepresentation.selectedValueRepresentation
			=== ValueRepresentationType.totalRelative) {
			if (type === DisplayType.extern) {
				const childModulesTotal = this.calculateModulesTotal(metaDataNode, 
					this.sensorValueRepresentation.selectedSensorValueType, this.sensorValueRepresentation.formula)

				proportion = childModulesTotal / (modulesTotalValue + internalTotalValue) * 100
			} else {
				const result = calcOrReturnSensorValue(metaDataNode.aggregatedInternSourceMetaData
					.total.sensorValues, 
				this.sensorValueRepresentation.selectedSensorValueType, this.sensorValueRepresentation.formula)
				proportion = result / (modulesTotalValue + internalTotalValue) * 100
			}
			this.displayedSensorValue = proportion
			this.description = proportion.toFixed(1) + '%'
		}
		{
			if (this.file) {
				const file = Uri.file(this.file.toPlatformString())
				this.command = { command: 'vscode.open', title: label, arguments: [file] }
			}
		}
	}

	calculateModulesTotal(node: SourceFileMetaDataTree<SourceFileMetaDataTreeType>, 
		sensorValueType: ExtendedSensorValueType, formula: string | undefined): number {
		let total = 0
		for (const externChild of node.externChildren.values()) {
			total += calcOrReturnSensorValue(externChild.aggregatedInternSourceMetaData
				.total.sensorValues, sensorValueType, formula)
		}
		return total
	
	}
}

export class SourceFileMetaDataTreeProvider implements vscode.TreeDataProvider<SourceFileMetaDataTreeNode> {
	container: Container
	sourceFileMetaDataTree: SourceFileMetaDataTree<SourceFileMetaDataTreeType> | undefined
	sensorValueRepresentation: SensorValueRepresentation
	modulesTotalValue = 0
	includedFilterPath: string | undefined
	excludedFilterPath: string | undefined
	sortDirection = 'default'
	directoryTree: DirectoryTreeNode[] = []
	private changeEvent = new EventEmitter<void>()
	public get onDidChangeTreeData(): Event<void> {
		return this.changeEvent.event
	}

	constructor(container: Container) {
		this.container = container
		this.loadFromProjectReport()
		this.container.eventHandler.onReportLoaded(this.reportLoaded.bind(this))
		this.container.eventHandler.onSelectedSensorValueTypeChange(this.selectedSensorValueTypeChanged.bind(this))
		this.container.eventHandler.onSortDirectionChange(this.sortDirectionChanged.bind(this))
		const sensorValueRepresentation = this.container.storage.getWorkspace('sensorValueRepresentation') as SensorValueRepresentation
		if (sensorValueRepresentation === undefined){
			this.sensorValueRepresentation = defaultSensorValueRepresentation()
		} else {
			this.sensorValueRepresentation = sensorValueRepresentation	
		}
		
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
	): void{
		const oldRepresentation = this.sensorValueRepresentation 
		const oldModulesTotalValue = this.modulesTotalValue
		this.sensorValueRepresentation = sensorValueRepresentation
		let modulesTotalValue = 0
		if (this.sourceFileMetaDataTree && this.sourceFileMetaDataTree.type === 'Root' 
			&& this.sensorValueRepresentation.selectedSensorValueType !== undefined){
			for (const externChild of this.sourceFileMetaDataTree.externChildren.values()) {
				try { 
					const value = calcOrReturnSensorValue(externChild.aggregatedInternSourceMetaData
						.total.sensorValues, this.sensorValueRepresentation.selectedSensorValueType, this.sensorValueRepresentation.formula || '')
					modulesTotalValue += value
				} catch (e){
					this.sensorValueRepresentation = oldRepresentation
					modulesTotalValue = oldModulesTotalValue
				}

				this.modulesTotalValue = modulesTotalValue
			}
			this.changeEvent.fire()
		}
	}

	loadFromProjectReport() {
		const projectReport = this.container.textDocumentController.projectReport
		if (projectReport) {
			this.sourceFileMetaDataTree = SourceFileMetaDataTree.fromProjectReport(projectReport)
			this.includedFilterPath = this.container.storage.getWorkspace('includedFilterPath') as string
			this.excludedFilterPath = this.container.storage.getWorkspace('excludedFilterPath') as string
			if (this.includedFilterPath !== undefined || this.excludedFilterPath !== undefined) {
				this.createFilteredDirectoryTree()
			}
			this.valueRepresentation(this.sensorValueRepresentation)
			this.changeEvent.fire()
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
		this.changeEvent.fire()
	}


	filter(command: string, text: string) {
		if (command === 'included-path-change') {
			this.includedFilterPath = text
			this.container.storage.storeWorkspace('includedFilterPath', this.includedFilterPath)
		} else if (command === 'excluded-path-change') {
			this.excludedFilterPath = text
			this.container.storage.storeWorkspace('excludedFilterPath', this.excludedFilterPath)
		}
		this.createFilteredDirectoryTree()
		this.valueRepresentation(this.sensorValueRepresentation)
	}

	createFilteredDirectoryTree() {
		this.directoryTree = []
		this.createDirectoryTree()
		this.directoryTree = this.directoryTree
			.map(node => node.filterTree(this.includedFilterPath, this.excludedFilterPath))
			.filter(node => node !== null) as DirectoryTreeNode[]
		for (let i = 0; i < this.directoryTree.length; i++) {
			this.directoryTree[i] = this.directoryTree[i].updateAllNodesMeasurements()
		}
	}

	createDirectoryTree(element?: SourceFileMetaDataTreeNode | undefined):
	vscode.ProviderResult<SourceFileMetaDataTreeNode[]> {
		if (!this.sourceFileMetaDataTree) {
			return
		}
		const node = element ? element.metaDataNode : this.sourceFileMetaDataTree
		const result: vscode.ProviderResult<SourceFileMetaDataTreeNode[]>[] = []
		const displayAsIntern = !element || element.type === DisplayType.intern
		const children = displayAsIntern ? node.internChildren : node.externChildren
		let directory
		for (const [filePathPart, childNode] of children.entries()) {
			const isEmpty =
				childNode.internChildren.size + childNode.externChildren.size === 0
			let workspaceFilePath
			const nodeModule =
				childNode.type === 'Module'
					? NodeModule.fromIdentifier(filePathPart as NodeModuleIdentifier_string)
					: undefined
			directory = element
				? element.directory?.join(nodeModule?.name || filePathPart)
				: new UnifiedPath(filePathPart)
			const sourceFileMetaDataTreeNode = new SourceFileMetaDataTreeNode(
				filePathPart,
				DisplayType.intern,
				node,
				childNode,
				this.sensorValueRepresentation,
				0,
				this.modulesTotalValue,
				this.includedFilterPath || '',
				this.excludedFilterPath || '',
				isEmpty
					? vscode.TreeItemCollapsibleState.None
					: vscode.TreeItemCollapsibleState.Collapsed,
				directory,
				workspaceFilePath
			)
			if (directory){
				const directoryTreeNode = new DirectoryTreeNode(directory.toString(), 
					sourceFileMetaDataTreeNode.metaDataNode.aggregatedInternSourceMetaData.total.sensorValues,
					sourceFileMetaDataTreeNode.metaDataNode.type)
				if (element && element.directory) {
					const parentDirectoryTreeNode = DirectoryTreeNode.findNodeInTree(
						element.directory.toString(), this.directoryTree)
					if (parentDirectoryTreeNode) {
						parentDirectoryTreeNode.children.push(directoryTreeNode)
					}

				} else {
					this.directoryTree.push(directoryTreeNode)
				}
			}
			result.push(this.createDirectoryTree(
				sourceFileMetaDataTreeNode
			))
		}
		if (displayAsIntern) {
			directory = new UnifiedPath('./node_modules')
			const nodeModules = DirectoryTreeNode.findInDirectoryTree(directory.toString(), this.directoryTree)
			if (node.externChildren.size > 0 && !nodeModules) {
				const sourceFileMetaDataTreeNode = new SourceFileMetaDataTreeNode(
					'node_modules',
					DisplayType.extern,
					node,
					node,
					this.sensorValueRepresentation,
					0,
					this.modulesTotalValue,
					this.includedFilterPath || '',
					this.excludedFilterPath || '',
					vscode.TreeItemCollapsibleState.Collapsed,
					directory
				)
				const directoryTreeNode = new DirectoryTreeNode(directory.toString(), 
					sourceFileMetaDataTreeNode.metaDataNode.aggregatedInternSourceMetaData.total.sensorValues,
					sourceFileMetaDataTreeNode.metaDataNode.type)
				this.directoryTree.push(directoryTreeNode)
				result.push(this.createDirectoryTree(
					sourceFileMetaDataTreeNode
				))
			}
		}
		return Promise.resolve(result) as vscode.ProviderResult<SourceFileMetaDataTreeNode[]>

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
		if (this.sensorValueRepresentation.selectedSensorValueType) {
			internalTotalValue = calcOrReturnSensorValue(
				this.sourceFileMetaDataTree.aggregatedInternSourceMetaData.total.sensorValues,
				this.sensorValueRepresentation.selectedSensorValueType,
				this.sensorValueRepresentation.formula
			)

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
				workspaceFilePath = filePath
					? WorkspaceUtils.getFileFromWorkspace(filePath.toString())
					: undefined

			}

			let found = true
			if (directory) {
				if ((this.includedFilterPath && this.includedFilterPath.length > 0)
					|| (this.excludedFilterPath && this.excludedFilterPath.length > 0)) {
					found = DirectoryTreeNode.findInDirectoryTree(directory.toString(), this.directoryTree) !== null
				}
			}

			if (!found) {
				continue
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
					this.includedFilterPath || '',
					this.excludedFilterPath || '',
					isEmpty
						? vscode.TreeItemCollapsibleState.None
						: vscode.TreeItemCollapsibleState.Collapsed,
					directory,
					workspaceFilePath
				)
			)
		}
		if (displayAsIntern) {
			if (node.externChildren.size > 0) {
				const path = new UnifiedPath('./node_modules')
				let found = true
				let foundNode
				if (path) {
					if ((this.includedFilterPath && this.includedFilterPath.length > 0)
						|| (this.excludedFilterPath && this.excludedFilterPath.length > 0)) {
						foundNode = DirectoryTreeNode.findInDirectoryTree(path.toString(), this.directoryTree)
						found = foundNode !== null
					}
				}
				if (found) {
					result.push(
						new SourceFileMetaDataTreeNode(
							'node_modules',
							DisplayType.extern,
							node,
							node,
							this.sensorValueRepresentation,
							internalTotalValue,
							this.modulesTotalValue,
							this.includedFilterPath || '',
							this.excludedFilterPath || '',
							vscode.TreeItemCollapsibleState.Collapsed,
							path,
							undefined,
							foundNode ? foundNode : undefined
						)
					)
				}
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
