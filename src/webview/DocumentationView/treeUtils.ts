import { DocumentationFile } from '../../protocols/DocumentationViewProtocol'

export type FolderNode = {
	name: string
	path: string
	folders: FolderNode[]
	files: DocumentationFile[]
	indexFile?: DocumentationFile
}

export type BreadcrumbItem = {
	label: string
	path: string
	clickable: boolean
}

export function buildFolderTree(files: DocumentationFile[]) {
	const root: FolderNode = { name: '', path: '', folders: [], files: [] }
	const byPath = new Map<string, FolderNode>([['', root]])

	for (const file of files) {
		const parts = file.path.split('/').filter(Boolean)
		const fileName = parts.pop()
		let currentPath = ''
		let node = root

		for (const part of parts) {
			currentPath = currentPath ? `${currentPath}/${part}` : part
			let child = byPath.get(currentPath)
			if (!child) {
				child = { name: part, path: currentPath, folders: [], files: [] }
				byPath.set(currentPath, child)
				node.folders.push(child)
			}
			node = child
		}

		if (fileName) {
			const rank = getIndexFileRank(fileName)
			if (rank > 0) {
				const currentRank = node.indexFile ? getIndexFileRank(node.indexFile.name) : 0
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
		node.folders.forEach(sortNode)
	}
	sortNode(root)

	return root
}

export function getFolderFiles(node: FolderNode) {
	if (node.indexFile && node.indexFile.name.toLowerCase() !== 'readme.md') {
		return [node.indexFile, ...node.files]
	}
	return node.files
}

export function buildDefaultFileMap(node: FolderNode) {
	const map = new Map<string, string>()
	const walk = (folder: FolderNode) => {
		if (folder.indexFile) {
			map.set(folder.path, folder.indexFile.path)
		} else if (folder.files.length > 0) {
			map.set(folder.path, folder.files[0].path)
		}
		folder.folders.forEach(walk)
	}
	walk(node)
	return map
}

export function buildBreadcrumbs(
	selectedDoc: DocumentationFile | undefined,
	folderDefaultMap: Map<string, string>
) {
	if (!selectedDoc) return []
	const parts = selectedDoc.path.split('/').filter(Boolean)
	const lastPart = parts[parts.length - 1]?.toLowerCase()
	const isIndex =
		lastPart === 'index.md' ||
		(lastPart === 'readme.md' && parts.length > 1)
	const crumbs: BreadcrumbItem[] = []
	let current = ''
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i]
		if (i === parts.length - 1 && isIndex) {
			break
		}
		current = current ? `${current}/${part}` : part
		const isFile = i === parts.length - 1 && !isIndex
		const clickable = !isFile && folderDefaultMap.has(current)
		crumbs.push({
			label: stripExtension(part),
			path: current,
			clickable
		})
	}
	return crumbs
}

export function stripExtension(name: string) {
	return name.replace(/\.md$/i, '')
}

function getIndexFileRank(fileName: string) {
	const lower = fileName.toLowerCase()
	if (lower === 'readme.md') return 2
	if (lower === 'index.md') return 1
	return 0
}
