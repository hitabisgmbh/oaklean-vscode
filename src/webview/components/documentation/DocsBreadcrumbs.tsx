import type { ReactElement } from 'react'

import { DOCUMENTATION_ROOT_LABEL } from '../../../constants/documentationUi'
import type { BreadcrumbItem } from '../../../types/documentationView'

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
}: DocsBreadcrumbsProps): ReactElement | null {
	if (breadcrumbs.length === 0) {
		return null
	}

	return (
		<div className="doc-breadcrumbs">
			{rootTarget !== undefined ? (
				<button
					type="button"
					className="doc-breadcrumb doc-breadcrumb-link doc-breadcrumb-root"
					onClick={onSelectRoot}
				>
					{DOCUMENTATION_ROOT_LABEL}
				</button>
			) : (
				<span className="doc-breadcrumb doc-breadcrumb-root">
					{DOCUMENTATION_ROOT_LABEL}
				</span>
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
