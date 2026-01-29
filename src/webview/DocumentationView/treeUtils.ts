import type { DocumentationFile } from '../../protocols/DocumentationViewProtocol'
import type { BreadcrumbItem, FolderNode } from '../../types/documentationView'

export function buildFolderTree(files: DocumentationFile[]): FolderNode {
	const root: FolderNode = { name: '', path: '', folders: [], files: [] }
	const byPath = new Map<string, FolderNode>([['', root]])

	for (const file of files) {
		const parts = file.path.split('/').filter((part) => part !== '')
		const fileName = parts.pop()
		let currentPath = ''
		let node = root

		for (const part of parts) {
			currentPath = currentPath === '' ? part : `${currentPath}/${part}`
			let child = byPath.get(currentPath)
			if (child === undefined) {
				child = { name: part, path: currentPath, folders: [], files: [] }
				byPath.set(currentPath, child)
				node.folders.push(child)
			}
			node = child
		}

		if (fileName !== undefined) {
			const rank = getIndexFileRank(fileName)
			if (rank > 0) {
				const currentRank =
					node.indexFile !== undefined
						? getIndexFileRank(node.indexFile.name)
						: 0
				if (rank > currentRank) {
					node.indexFile = file
				}
				continue
			}
		}
		node.files.push(file)
	}

	const sortNode = (node: FolderNode) => {
		node.folders.sort((a, b) => a.name.localeCompare(b.name))
		node.files.sort((a, b) => a.name.localeCompare(b.name))
		for (const folder of node.folders) {
			sortNode(folder)
		}
	}
	sortNode(root)

	return root
}

export function getFolderFiles(node: FolderNode): DocumentationFile[] {
	if (
		node.indexFile !== undefined &&
		node.indexFile.name.toLowerCase() !== 'readme.md'
	) {
		return [node.indexFile, ...node.files]
	}
	return node.files
}

export function buildDefaultFileMap(node: FolderNode): Map<string, string> {
	const map = new Map<string, string>()
	const walk = (folder: FolderNode) => {
		if (folder.indexFile !== undefined) {
			map.set(folder.path, folder.indexFile.path)
		} else if (folder.files.length > 0) {
			map.set(folder.path, folder.files[0].path)
		}
		for (const child of folder.folders) {
			walk(child)
		}
	}
	walk(node)
	return map
}

export function buildBreadcrumbs(
	selectedDoc: DocumentationFile | undefined,
	folderDefaultMap: Map<string, string>
): BreadcrumbItem[] {
	if (selectedDoc === undefined) {
		return []
	}
	const parts = selectedDoc.path.split('/').filter((part) => part !== '')
	const lastPart = parts[parts.length - 1]?.toLowerCase()
	const isIndex =
		lastPart === 'index.md' || (lastPart === 'readme.md' && parts.length > 1)
	const crumbs: BreadcrumbItem[] = []
	let current = ''
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i]
		if (i === parts.length - 1 && isIndex) {
			break
		}
		current = current === '' ? part : `${current}/${part}`
		const isFile = i === parts.length - 1 && !isIndex
		const clickable = !isFile && folderDefaultMap.has(current)
		crumbs.push({
			label: stripExtension(part),
			path: current,
			clickable
		})
	}
	if (crumbs.length > 0) {
		crumbs[crumbs.length - 1].clickable = false
	}
	return crumbs
}

export function stripExtension(name: string): string {
	return name.replace(/\.md$/i, '')
}

function getIndexFileRank(fileName: string): number {
	const lower = fileName.toLowerCase()
	if (lower === 'readme.md') {
		return 2
	}
	if (lower === 'index.md') {
		return 1
	}
	return 0
}
