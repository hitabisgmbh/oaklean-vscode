type CodiconButtonProps = {
	codiconName: string,
	title?: string,
	onClick?: () => void
}

export function CodiconButton({ codiconName, title, onClick }: CodiconButtonProps) {
	return (
		<div
			className={`button codicon ${codiconName}`}
			title={title}
			onClick={onClick}
		></div>
	)
}