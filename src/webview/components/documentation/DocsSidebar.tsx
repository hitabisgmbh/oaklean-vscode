import { DocumentationFile } from '../../../protocols/DocumentationViewProtocol'
import { FolderNode, getFolderFiles, stripExtension } from '../../DocumentationView/treeUtils'

type SearchResult = {
	path: string
	name: string
	snippet: string
	occurrence: number
}

type DocsSidebarProps = {
	query: string
	results: SearchResult[]
	folderTree: FolderNode
	selectedPath: string
	expandedFolders: Set<string>
	isEmpty: boolean
	overviewPath?: string
	onQueryChange: (value: string) => void
	onResultSelect: (path: string, occurrence: number) => void
	onSelectFile: (path: string) => void
	onToggleFolder: (path: string) => void
	onSelectFolder: (path: string) => void
}

export function DocsSidebar({
	query,
	results,
	folderTree,
	selectedPath,
	expandedFolders,
	isEmpty,
	overviewPath,
	onQueryChange,
	onResultSelect,
	onSelectFile,
	onToggleFolder,
	onSelectFolder
}: DocsSidebarProps) {
	const indentSize = 12

	function renderOverview() {
		if (!overviewPath) return null
		return (
			<div key="doc-overview" className="doc-tree-row" style={{ paddingLeft: 0 }}>
				<span className="doc-tree-toggle-placeholder" />
				<button
					type="button"
					className={`doc-file-button${overviewPath === selectedPath ? ' doc-file-button-active' : ''}`}
					onClick={() => onSelectFile(overviewPath)}
				>
					Overview
				</button>
			</div>
		)
	}

	function renderFileButton(doc: DocumentationFile, depth: number) {
		return (
			<div key={doc.path} className="doc-tree-row" style={{ paddingLeft: depth * indentSize }}>
				<span className="doc-tree-toggle-placeholder" />
				<button
					type="button"
					className={`doc-file-button${doc.path === selectedPath ? ' doc-file-button-active' : ''}`}
					onClick={() => onSelectFile(doc.path)}
				>
					{stripExtension(doc.name)}
				</button>
			</div>
		)
	}

	function renderFolderNode(folder: FolderNode, depth: number) {
		const isExpanded = expandedFolders.has(folder.path)
		const folderFiles = getFolderFiles(folder)
		const hasChildren = folder.folders.length > 0 || folderFiles.length > 0

		return (
			<div key={folder.path} className="doc-tree-node">
				<div className="doc-tree-row" style={{ paddingLeft: depth * indentSize }}>
					{hasChildren ? (
						<button
							className="doc-tree-toggle"
							type="button"
							onClick={() => onToggleFolder(folder.path)}
							aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
						>
							{isExpanded ? '▾' : '▸'}
						</button>
					) : (
						<span className="doc-tree-toggle-placeholder" />
					)}
					<button
						type="button"
						className="doc-folder-button"
						onClick={() => onSelectFolder(folder.path)}
					>
						{folder.name}
					</button>
				</div>
				{isExpanded && (
					<div className="doc-tree-children">
						{folderFiles.map((doc) => renderFileButton(doc, depth + 1))}
						{folder.folders.map((child) => renderFolderNode(child, depth + 1))}
					</div>
				)}
			</div>
		)
	}

	return (
		<aside className="doc-sidebar">
			<input
				className="doc-search"
				type="text"
				placeholder="Search documentation"
				value={query}
				onChange={(event) => onQueryChange(event.target.value)}
			/>
			{query && (
				<div className="doc-search-dropdown">
					{results.map((res) => (
						<button
							key={`${res.path}:${res.occurrence}`}
							className="doc-result-button"
							onClick={() => onResultSelect(res.path, res.occurrence)}
						>
							<div className="doc-result-title">
								{overviewPath && res.path === overviewPath
									? 'Overview'
									: stripExtension(res.name)}
							</div>
							<div
								className="doc-result-snippet"
								dangerouslySetInnerHTML={{ __html: res.snippet }}
							/>
						</button>
					))}
					{results.length === 0 && (
						<div className="doc-empty">No matches</div>
					)}
				</div>
			)}
			<div className="doc-file-list">
				{renderOverview()}
				{folderTree.folders.map((folder) => renderFolderNode(folder, 0))}
				{getFolderFiles(folderTree).map((doc) => renderFileButton(doc, 0))}
				{isEmpty && (
					<div className="doc-empty">No matches</div>
				)}
			</div>
		</aside>
	)
}
