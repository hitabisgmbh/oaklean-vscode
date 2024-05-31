export function pad(s: string, before = 0, after = 0, padding = '\u00a0') {
	if (before === 0 && after === 0) {
		return s
	}

	return `${before === 0 ? '' : padding.repeat(before)}${s}${after === 0 ? '' : padding.repeat(after)}`
}