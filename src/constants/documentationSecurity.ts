export const DOCUMENTATION_ALLOWED_IMAGE_PROTOCOL_HTTP = 'http:'
export const DOCUMENTATION_ALLOWED_IMAGE_PROTOCOL_HTTPS = 'https:'

export const DOCUMENTATION_ALLOWED_IMAGE_PROTOCOLS = [
	DOCUMENTATION_ALLOWED_IMAGE_PROTOCOL_HTTP,
	DOCUMENTATION_ALLOWED_IMAGE_PROTOCOL_HTTPS
] as const

export const DOCUMENTATION_ALLOWED_IMAGE_HOST_OAKLEAN = 'www.oaklean.io'
export const DOCUMENTATION_ALLOWED_IMAGE_HOST_GITHUB = 'github.com'
export const DOCUMENTATION_ALLOWED_IMAGE_GITHUB_PATH_PREFIX =
	'/hitabisgmbh/oaklean'

export const DOCUMENTATION_ALLOWED_IMAGE_CSP_SOURCES = [
	'http://www.oaklean.io',
	'https://www.oaklean.io',
	'http://github.com/hitabisgmbh/oaklean',
	'https://github.com/hitabisgmbh/oaklean'
] as const
