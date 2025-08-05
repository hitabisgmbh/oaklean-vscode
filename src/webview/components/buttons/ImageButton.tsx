import './ImageButton.css'

type ImageButtonProps = {
	imagePath: string
	title?: string
	onClick?: () => void
}

export function ImageButton({ imagePath, title, onClick }: ImageButtonProps) {
	const mediaPath = (window as any).__MEDIA_PATH__

	return (
		<img
			className="image-button"
			src={`${mediaPath}/${imagePath}`}
			title={title}
			onClick={onClick}
		></img>
	)
}
