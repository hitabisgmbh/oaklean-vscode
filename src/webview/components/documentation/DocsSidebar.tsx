import type { ReactElement } from 'react'

import {
	DOCUMENTATION_COLLAPSE_FOLDER_LABEL,
	DOCUMENTATION_EMPTY_RESULTS_LABEL,
	DOCUMENTATION_EXPAND_FOLDER_LABEL,
	DOCUMENTATION_OVERVIEW_LABEL,
	DOCUMENTATION_SEARCH_PLACEHOLDER,
	DOCUMENTATION_SHOW_MORE_LABEL,
	DOCUMENTATION_TREE_INDENT_IN_PX
} from '../../../constants/documentationUi'
import {
	getFolderFiles,
	stripExtension
} from '../../DocumentationView/treeUtils'
import type { DocumentationFile } from '../../../protocols/DocumentationViewProtocol'
import type { FolderNode, SearchResult } from '../../../types/documentationView'

type DocsSidebarProps = {
	query: string
	results: SearchResult[]
	visibleResultsCount: number
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
	onShowMoreResults: () => void
}

export function DocsSidebar({
	query,
	results,
	visibleResultsCount,
	folderTree,
	selectedPath,
	expandedFolders,
	isEmpty,
	overviewPath,
	onQueryChange,
	onResultSelect,
	onSelectFile,
	onToggleFolder,
	onSelectFolder,
	onShowMoreResults
}: DocsSidebarProps): ReactElement {
	const indentSize = DOCUMENTATION_TREE_INDENT_IN_PX
	const visibleResults = results.slice(0, visibleResultsCount)
	const canShowMoreResults = results.length > visibleResultsCount

	function renderOverview() {
		if (overviewPath === undefined) {
			return null
		}
		return (
			<div
				key="doc-overview"
				className="doc-tree-row"
				style={{ paddingLeft: 0 }}
			>
				<span className="doc-tree-toggle-placeholder" />
				<button
					type="button"
					className={`doc-file-button${overviewPath === selectedPath ? ' doc-file-button-active' : ''}`}
					onClick={() => onSelectFile(overviewPath)}
				>
					{DOCUMENTATION_OVERVIEW_LABEL}
				</button>
			</div>
		)
	}

	function renderFileButton(doc: DocumentationFile, depth: number) {
		return (
			<div
				key={doc.path}
				className="doc-tree-row"
				style={{ paddingLeft: depth * indentSize }}
			>
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
				<div
					className="doc-tree-row"
					style={{ paddingLeft: depth * indentSize }}
				>
					{hasChildren ? (
						<button
							className="doc-tree-toggle"
							type="button"
							onClick={() => onToggleFolder(folder.path)}
							aria-label={
								isExpanded
									? DOCUMENTATION_COLLAPSE_FOLDER_LABEL
									: DOCUMENTATION_EXPAND_FOLDER_LABEL
							}
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
						{folder.folders.map((child: FolderNode) =>
							renderFolderNode(child, depth + 1)
						)}
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
				placeholder={DOCUMENTATION_SEARCH_PLACEHOLDER}
				value={query}
				onChange={(event) => onQueryChange(event.target.value)}
			/>
			{query !== '' && (
				<div className="doc-search-dropdown">
					{visibleResults.map((res) => (
						<button
							key={`${res.path}:${res.occurrence}`}
							type="button"
							className="doc-result-button"
							onClick={() => onResultSelect(res.path, res.occurrence)}
						>
							<div className="doc-result-title">
								{overviewPath !== undefined && res.path === overviewPath
									? DOCUMENTATION_OVERVIEW_LABEL
									: stripExtension(res.name)}
							</div>
							<div
								className="doc-result-snippet"
								dangerouslySetInnerHTML={{ __html: res.snippet }}
							/>
						</button>
					))}
					{canShowMoreResults && (
						<button
							type="button"
							className="doc-result-more"
							onClick={onShowMoreResults}
						>
							{DOCUMENTATION_SHOW_MORE_LABEL}
						</button>
					)}
					{results.length === 0 && (
						<div className="doc-empty">{DOCUMENTATION_EMPTY_RESULTS_LABEL}</div>
					)}
				</div>
			)}
			<div className="doc-file-list">
				{renderOverview()}
				{folderTree.folders.map((folder: FolderNode) =>
					renderFolderNode(folder, 0)
				)}
				{getFolderFiles(folderTree).map((doc) => renderFileButton(doc, 0))}
				{isEmpty && (
					<div className="doc-empty">{DOCUMENTATION_EMPTY_RESULTS_LABEL}</div>
				)}
			</div>
		</aside>
	)
}
