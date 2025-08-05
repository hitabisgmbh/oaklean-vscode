import './TreeViewHeader.css'

type TreeViewHeaderProps = {
	leftSection?: React.ReactNode,
	rightSection?: React.ReactNode
}

export function TreeViewHeader({ leftSection, rightSection }: TreeViewHeaderProps) {
	return (
		<div className='tree-view-header'>
			<div className='left-section'>
				{leftSection}
			</div>
			<div className='right-section'>
				{rightSection}
			</div>
		</div>
	)
}