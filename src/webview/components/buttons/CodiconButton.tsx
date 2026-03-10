import './CodiconButton.css'

type CodiconButtonProps = {
	codiconName: string
	title?: string
	onClick?: () => void
}

export function CodiconButton({
	codiconName,
	title,
	onClick
}: CodiconButtonProps) {
	return (
		<button
			type="button"
			className={`codicon-button codicon ${codiconName}`}
			title={title}
			aria-label={title ?? codiconName}
			onClick={onClick}
		></button>
	)
}
