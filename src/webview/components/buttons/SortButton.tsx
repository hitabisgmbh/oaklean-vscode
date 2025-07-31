import React from 'react'

import { ImageButton } from './ImageButton'

import { SortDirection } from '../../../types/sortDirection'

export type SortButtonProps = {
	sortDirection: SortDirection
	setSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>;
}

export function SortButton({ sortDirection, setSortDirection }: SortButtonProps) {
	function handleSortClick() {
		switch (sortDirection) {
			case SortDirection.default:
				setSortDirection(SortDirection.desc)
				break
			case SortDirection.asc:
				setSortDirection(SortDirection.default)
				break
			case SortDirection.desc:
				setSortDirection(SortDirection.asc)
				break
		}
	}

	return (
		<ImageButton imagePath={`sort-vertical-${sortDirection}.png`} onClick={handleSortClick}/>
	)
}
