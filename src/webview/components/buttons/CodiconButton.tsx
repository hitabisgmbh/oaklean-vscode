import './CodiconButton.css'

type CodiconButtonProps = {
	codiconName: string,
	title?: string,
	onClick?: () => void
}

export function CodiconButton({ codiconName, title, onClick }: CodiconButtonProps) {
	return (
		<div
			className={`codicon-button button codicon ${codiconName}`}
			title={title}
			onClick={onClick}
		></div>
	)
}