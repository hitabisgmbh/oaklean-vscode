import {
	SensorValues,
	UnifiedPath_string,
	SourceFileMetaDataTreeType
} from '@oaklean/profiler-core'
import globToRegExp from 'glob-to-regexp'

export class DirectoryTreeNode {
	directory: UnifiedPath_string
	measurement: SensorValues
	type: SourceFileMetaDataTreeType
	children: DirectoryTreeNode[]
	isModulesDirectory: boolean
	constructor(directory: UnifiedPath_string, measurement: SensorValues,
		type: SourceFileMetaDataTreeType, isModulesDirectory: boolean) {
		this.directory = directory
		this.measurement = measurement
		this.type = type
		this.isModulesDirectory = isModulesDirectory
		this.children = []
	}

	filterTree(
		includedFilterPath: string | undefined,
		excludedFilterPath: string | undefined,
		childNode?: DirectoryTreeNode | undefined
	): DirectoryTreeNode | null {
		if (includedFilterPath && !(includedFilterPath.endsWith('/*') || includedFilterPath.endsWith('/'))) {
			includedFilterPath = includedFilterPath + '/*'
		} else if (includedFilterPath && includedFilterPath.endsWith('/')) {
			includedFilterPath = includedFilterPath + '*'
		}
		const node = childNode ? childNode : this
		const filteredChildren = node.children
			.map(child => this.filterTree(includedFilterPath, excludedFilterPath, child))
			.filter(child => child !== null && (child.type === 'File' || child.children.length > 0)) as DirectoryTreeNode[]
		const isIncludedNode = includedFilterPath ? node.checkGlob(includedFilterPath) : true
		const isExcludedNode = excludedFilterPath ? node.checkGlob(excludedFilterPath) : false
		if (isExcludedNode) {
			return null
		}

		if (isIncludedNode || filteredChildren.length > 0) {
			node.children = filteredChildren
			return node
		} else {
			return null
		}
	}

	updateAllNodesMeasurements(root?: DirectoryTreeNode) {
		let rootNode
		if (root) {
			rootNode = root
		} else {
			// eslint-disable-next-line @typescript-eslint/no-this-alias
			rootNode = this
		}
		if (this.children.length === 0) {
			this.updateMeasurement(rootNode)
		} else {

			for (const child of this.children) {
				child.updateAllNodesMeasurements(rootNode)
			}
		}
		return this
	}

	updateMeasurement(root: DirectoryTreeNode) {
		const parent = this.findParent(root)
		if (parent === null) {
			return
		}
		for (const key of Object.keys(parent.measurement)) {
			const siblingsSum = parent.children.reduce((sum, child) => sum + child.measurement[key], 0)
			parent.measurement[key] = siblingsSum
		}

		if (parent) {
			parent.updateMeasurement(root)
		}
	}

	findParent(root: DirectoryTreeNode): DirectoryTreeNode | null {
		for (const child of root.children) {
			if (child === this) {
				return root
			}

			const result = this.findParent(child)
			if (result !== null) {
				return result
			}
		}

		return null
	}

	checkGlob(filterPath: string) {
		const normalizedDirectory = this.directory.toString().startsWith('./') ? this.directory.toString().substring(2) : this.directory.toString()
		const normalizedFilterPath = filterPath.startsWith('./') ? filterPath.substring(2) : filterPath
		const includeRe = globToRegExp(normalizedFilterPath, { extended: true })
		return includeRe.test(normalizedDirectory) || includeRe.test(normalizedDirectory + '/')
	}

	static findNodeInTree(directory: UnifiedPath_string, nodes: DirectoryTreeNode[]):
		DirectoryTreeNode | undefined {
		for (const node of nodes) {
			if (node.directory === directory) {
				return node
			}
			const foundNode = DirectoryTreeNode.findNodeInTree(directory, node.children)
			if (foundNode) {
				return foundNode
			}
		}
		return undefined
	}


	findNodeByDirectory(directory: UnifiedPath_string): DirectoryTreeNode | null {
		if (this.directory === directory) {
			return this
		}

		for (const child of this.children) {
			const result = child.findNodeByDirectory(directory)

			if (result !== null) {
				return result
			}
		}
		return null
	}

	static findInDirectoryTree(directory: UnifiedPath_string, directoryTree: DirectoryTreeNode[]) {
		for (const node of directoryTree) {
			const result = node.findNodeByDirectory(directory)
			if (result !== null) {
				return result
			}
		}
		return null
	}
}