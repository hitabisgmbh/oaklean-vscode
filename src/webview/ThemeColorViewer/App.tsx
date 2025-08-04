import { useEffect, useState } from 'react'

type IColorData = {
	key: string
	description: string
}

declare const acquireVsCodeApi: any

export const vscode = acquireVsCodeApi()

export function App() {
	const [searchTerm, setSearchTerm] = useState('')
	const [groupedColors, setGroupedColors] = useState<
		Record<string, IColorData[]>
	>({})

	useEffect(() => {
		const themeColors = (window as any).__THEME_COLORS__ as IColorData[]
		themeColors.sort((a, b) => a.key.localeCompare(b.key))
		const groups: Record<string, IColorData[]> = {}
		themeColors.forEach((color) => {
			const [group] = color.key.split('-') // e.g., "commentsView" from "commentsView-resolvedIcon"
			if (!groups[group]) {
				groups[group] = []
			}
			groups[group].push(color)
		})
		setGroupedColors(groups)
	}, [])

	return (
		<div style={styles.container}>
			<h2>VS Code Theme Colors</h2>
			<input
				type="text"
				placeholder="Search colors..."
				value={searchTerm}
				onChange={(e) => setSearchTerm(e.target.value)}
				style={{
					marginBottom: '16px',
					padding: '8px',
					width: '100%',
					fontSize: '14px',
					borderRadius: '4px',
					border: '1px solid var(--vscode-input-border)',
					backgroundColor: 'var(--vscode-input-background)',
					color: 'var(--vscode-input-foreground)'
				}}
			/>
			<div style={styles.grid}>
				{Object.entries(groupedColors)
					.filter(
						([group, groupColors]) =>
							group.toLowerCase().includes(searchTerm.toLowerCase()) ||
							groupColors.some((color) =>
								color.key.toLowerCase().includes(searchTerm.toLowerCase())
							)
					)
					.map(([group, groupColors]) => (
						<div key={group} style={{ marginBottom: '24px' }}>
							<h3 style={styles.heading}>{group}</h3>
							<div style={styles.grid}>
								{groupColors
									.filter((color) =>
										color.key.toLowerCase().includes(searchTerm.toLowerCase())
									)
									.map((color) => (
										<div key={color.key} style={styles.card}>
											<div style={styles.text}>
												<div style={styles.name}>{color.key}</div>
												<div style={styles.value}>{color.description}</div>
											</div>
											<div
												style={{
													...styles.swatch,
													backgroundColor: `var(--vscode-${color.key})`
												}}
											/>
										</div>
									))}
							</div>
						</div>
					))}
			</div>
		</div>
	)
}

const styles: Record<string, React.CSSProperties> = {
	container: {
		padding: '16px',
		fontFamily: 'monospace',
		backgroundColor: 'var(--vscode-editor-background)',
		color: 'var(--vscode-editor-foreground)'
	},
	heading: {
		fontSize: '20px',
		marginBottom: '16px'
	},
	grid: {
		display: 'grid',
		gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
		gap: '12px'
	},
	card: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: '12px',
		border: '1px solid var(--vscode-editorWidget-border)',
		borderRadius: '6px',
		backgroundColor: 'var(--vscode-editorWidget-background)'
	},
	text: {
		flex: 1,
		marginRight: '8px'
	},
	name: {
		fontSize: '12px',
		color: 'var(--vscode-descriptionForeground)'
	},
	value: {
		marginTop: '4px',
		fontSize: '11px',
		opacity: 0.8
	},
	swatch: {
		width: '24px',
		height: '24px',
		borderRadius: '4px',
		border: '1px solid #ccc'
	}
}
