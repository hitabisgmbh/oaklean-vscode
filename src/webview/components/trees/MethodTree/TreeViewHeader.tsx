import './TreeViewHeader.css'

type TreeViewHeaderProps = {
	children: React.ReactNode
}

export function TreeViewHeader({ children }: TreeViewHeaderProps) {
	return (
		<div className="treeViewHeader">
				{children}
		</div>
	)
}