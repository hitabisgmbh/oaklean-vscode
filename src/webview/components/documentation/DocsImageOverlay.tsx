type DocsImageOverlayProps = {
	image: { src: string; alt?: string } | null
	onClose: () => void
}

export function DocsImageOverlay({ image, onClose }: DocsImageOverlayProps) {
	if (!image) return null

	return (
		<div
			className="doc-image-overlay"
			role="dialog"
			aria-modal="true"
			onClick={onClose}
		>
			<img
				src={image.src}
				alt={image.alt || 'Documentation image'}
				className="doc-image-zoom"
				onClick={(event) => event.stopPropagation()}
			/>
		</div>
	)
}
