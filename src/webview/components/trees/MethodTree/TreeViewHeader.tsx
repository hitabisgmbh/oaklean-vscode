import './TreeViewHeader.css'

type TreeViewHeaderProps = {
	buttons: React.ReactNode
}

export function TreeViewHeader({ buttons }: TreeViewHeaderProps) {
	return (
		<div className='tree-view-header'>
			<div className='header-buttons'>
				{buttons}
			</div>
		</div>
	)
}