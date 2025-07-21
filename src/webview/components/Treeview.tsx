import React from 'react'

import './treeview.css'

type TreeViewProps = {
	collapsed?: boolean
	defaultCollapsed?: boolean
	nodeLabel: React.ReactNode
	className?: string
	itemClassName?: string
	childrenClassName?: string
	children: React.ReactNode
	treeViewClassName?: string
	onClick?: (...args: any) => void,
}

class TreeView extends React.Component<TreeViewProps, { collapsed: boolean }> {
	constructor(props: TreeViewProps) {
		super(props)

		this.state = {
			collapsed: props.defaultCollapsed || false
		}
		this.handleClick = this.handleClick.bind(this)
	}

	handleClick(...args: any) {
		this.setState({ collapsed: !this.state.collapsed })
		if (this.props.onClick) {
			this.props.onClick(...args)
		}
	}

	render() {
		const {
			collapsed = this.state.collapsed,
			className = '',
			itemClassName = '',
			treeViewClassName = '',
			childrenClassName = '',
			nodeLabel,
			children
		} = this.props

		let arrowClassCodicon = 'codicon-chevron-down'
		let containerClassName = 'tree-view_children'
		if (collapsed) {
			arrowClassCodicon = 'codicon-chevron-right'
			containerClassName += ' collapsed'
		}

		const arrow = (
			<div
				className={className + ' codicon icon ' + arrowClassCodicon}
				onClick={this.handleClick}
			/>
		)

		return (
			<div className={'tree-view ' + treeViewClassName}>
				<div className={'tree-view_item ' + itemClassName}>
					{arrow}
					{nodeLabel}
				</div>
				<div className={containerClassName + ' ' + childrenClassName}>
					{children}
				</div>
			</div>
		)
	}
}

export default TreeView
