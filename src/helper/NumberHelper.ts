export function roundToThreeDecimals(value: number): number {
	return Math.round(value * 1000) / 1000
}