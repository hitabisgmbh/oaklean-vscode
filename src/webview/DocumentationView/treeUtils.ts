import {
	DOCUMENTATION_INDEX_FILE_NAME,
	DOCUMENTATION_README_FILE_NAME
} from '../../constants/documentationTree'
import type { DocumentationFile } from '../../protocols/DocumentationViewProtocol'
import type { BreadcrumbItem, FolderNode } from '../../types/documentationView'

// Input: flat docs list. Output: nested folder tree.
export function buildFolderTree(files: DocumentationFile[]): FolderNode {
	// Root node uses empty name/path for convenience.
	const root: FolderNode = { name: '', path: '', folders: [], files: [] }
	const byPath = new Map<string, FolderNode>([['', root]])

	for (const file of files) {
		// Split file path into folders + filename.
		const parts = file.path.split('/').filter((part) => part !== '')
		const fileName = parts.pop()
		let currentPath = ''
		let node = root

		for (const part of parts) {
			// Build or reuse folder nodes by their full path.
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
			// Prefer README/INDEX as folder default (ranked).
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

	// Sort folders and files alphabetically for stable UI.
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

// Input: folder node. Output: files with indexFile first when applicable.
export function getFolderFiles(node: FolderNode): DocumentationFile[] {
	if (
		node.indexFile !== undefined &&
		node.indexFile.name.toLowerCase() !== DOCUMENTATION_README_FILE_NAME
	) {
		return [node.indexFile, ...node.files]
	}
	return node.files
}

// Input: folder tree. Output: map of folder -> default file path.
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

// Input: selected doc + default map. Output: breadcrumb trail.
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
		lastPart === DOCUMENTATION_INDEX_FILE_NAME ||
		(lastPart === DOCUMENTATION_README_FILE_NAME && parts.length > 1)
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

// Input: filename. Output: filename without .md extension.
export function stripExtension(name: string): string {
	return name.replace(/\.md$/i, '')
}

// Input: filename. Output: rank for index files (README > INDEX).
function getIndexFileRank(fileName: string): number {
	const lower = fileName.toLowerCase()
	if (lower === DOCUMENTATION_README_FILE_NAME) {
		return 2
	}
	if (lower === DOCUMENTATION_INDEX_FILE_NAME) {
		return 1
	}
	return 0
}
