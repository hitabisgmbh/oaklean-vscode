export const createMockStore = (mockOnDidChange: any): Record<string, any> => {
	return new Proxy({}, {
		set: function (target: Record<string, any>, key: string, value: any) {
			target[key] = value

			mockOnDidChange({ key: key, workspace: true })

			return true
		}
	})
}
