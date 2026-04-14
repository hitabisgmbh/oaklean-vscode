declare module 'markdown-it' {
	import type Token from 'markdown-it/lib/token'
	import type Renderer from 'markdown-it/lib/renderer'
	export interface Options {
		html?: boolean
		xhtmlOut?: boolean
		breaks?: boolean
		langPrefix?: string
		linkify?: boolean
		typographer?: boolean
		quotes?: string | string[]
	}
	export default class MarkdownIt {
		constructor(options?: Options)
		render(src: string, env?: any): string
		renderer: {
			rules: Record<
				string,
				(
					tokens: Token[],
					idx: number,
					options: Options,
					env: unknown,
					self: Renderer
				) => string
			>
		}
	}
}

declare module 'markdown-it/lib/token' {
	export default class Token {
		content: string
		children?: Token[]
		attrSet(name: string, value: string): void
		attrGet(name: string): string | null
	}
}

declare module 'markdown-it/lib/renderer' {
	export default class Renderer {
		renderToken(tokens: any[], idx: number, options: any): string
	}
}
