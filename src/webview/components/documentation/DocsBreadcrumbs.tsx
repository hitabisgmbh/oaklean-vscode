import { BreadcrumbItem } from '../../DocumentationView/treeUtils'

type DocsBreadcrumbsProps = {
	breadcrumbs: BreadcrumbItem[]
	rootTarget?: string
	onSelectRoot: () => void
	onSelectCrumb: (path: string) => void
}

export function DocsBreadcrumbs({
	breadcrumbs,
	rootTarget,
	onSelectRoot,
	onSelectCrumb
}: DocsBreadcrumbsProps) {
	if (breadcrumbs.length === 0) return null

	return (
		<div className="doc-breadcrumbs">
			{rootTarget ? (
				<button
					type="button"
					className="doc-breadcrumb doc-breadcrumb-link doc-breadcrumb-root"
					onClick={onSelectRoot}
				>
					Docs
				</button>
			) : (
				<span className="doc-breadcrumb doc-breadcrumb-root">Docs</span>
			)}
			{breadcrumbs.map((crumb) => (
				<div key={crumb.path} className="doc-breadcrumb-group">
					<span className="doc-breadcrumb-sep">/</span>
					{crumb.clickable ? (
						<button
							type="button"
							className="doc-breadcrumb doc-breadcrumb-link"
							onClick={() => onSelectCrumb(crumb.path)}
						>
							{crumb.label}
						</button>
					) : (
						<span className="doc-breadcrumb">{crumb.label}</span>
					)}
				</div>
			))}
		</div>
	)
}
