import type { ReactElement } from 'react'

import { DOCUMENTATION_IMAGE_ALT_LABEL } from '../../../constants/documentationUi'
type DocsImageOverlayProps = {
	image: { src: string; alt?: string } | null
	onClose: () => void
}

export function DocsImageOverlay({
	image,
	onClose
}: DocsImageOverlayProps): ReactElement | null {
	if (image === null) {
		return null
	}

	return (
		<div
			className="doc-image-overlay"
			role="dialog"
			aria-modal="true"
			onClick={onClose}
		>
			<img
				src={image.src}
				alt={image.alt ?? DOCUMENTATION_IMAGE_ALT_LABEL}
				className="doc-image-zoom"
				onClick={(event) => event.stopPropagation()}
			/>
		</div>
	)
}
