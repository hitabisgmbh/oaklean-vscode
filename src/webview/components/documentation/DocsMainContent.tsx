import type { ReactElement, RefObject } from 'react'

import { DocsBreadcrumbs } from './DocsBreadcrumbs'
import { DocsImageOverlay } from './DocsImageOverlay'

import {
	DOCUMENTATION_MISSING_FILE_MESSAGE,
	DOCUMENTATION_MISSING_ICON_LABEL,
	DOCUMENTATION_SELECT_FILE_MESSAGE
} from '../../../constants/documentationUi'
import type { DocumentationEntry } from '../../../types/documentation'
import type { BreadcrumbItem } from '../../../types/documentationView'

type DocsMainContentProps = {
	breadcrumbs: BreadcrumbItem[]
	rootTarget: string | undefined
	zoomedImage: { src: string; alt?: string } | null
	missingLink: string | null
	selectedDoc: DocumentationEntry | undefined
	html: string
	contentRef: RefObject<HTMLDivElement | null>
	onCloseZoomImage: () => void
	onCloseMissingLink: () => void
	onSelectRoot: () => void
	onSelectCrumb: (path: string) => void
}

export function DocsMainContent({
	breadcrumbs,
	rootTarget,
	zoomedImage,
	missingLink,
	selectedDoc,
	html,
	contentRef,
	onCloseZoomImage,
	onCloseMissingLink,
	onSelectRoot,
	onSelectCrumb
}: DocsMainContentProps): ReactElement {
	return (
		<main className="doc-main">
			<DocsBreadcrumbs
				breadcrumbs={breadcrumbs}
				rootTarget={rootTarget}
				onSelectRoot={onSelectRoot}
				onSelectCrumb={onSelectCrumb}
			/>
			<DocsImageOverlay image={zoomedImage} onClose={onCloseZoomImage} />
			{missingLink !== null && (
				<div
					className="doc-missing-overlay"
					role="alertdialog"
					aria-live="assertive"
					onClick={onCloseMissingLink}
				>
					<div
						className="doc-missing-card"
						onClick={(event) => event.stopPropagation()}
					>
						<div className="doc-missing-icon" aria-hidden="true">
							{DOCUMENTATION_MISSING_ICON_LABEL}
						</div>
						<div className="doc-missing-text">
							{DOCUMENTATION_MISSING_FILE_MESSAGE}
						</div>
					</div>
				</div>
			)}
			<div className="doc-content" ref={contentRef}>
				{selectedDoc !== undefined ? (
					<div dangerouslySetInnerHTML={{ __html: html }} />
				) : (
					<div className="doc-empty">{DOCUMENTATION_SELECT_FILE_MESSAGE}</div>
				)}
			</div>
		</main>
	)
}
