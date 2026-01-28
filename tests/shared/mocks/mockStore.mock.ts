// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createMockStore = (mockOnDidChange: any): Record<string, any> => {
	return new Proxy(
		{},
		{
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			set: function (target: Record<string, any>, key: string, value: any) {
				target[key] = value

				mockOnDidChange({ key: key, workspace: true })

				return true
			}
		}
	)
}
