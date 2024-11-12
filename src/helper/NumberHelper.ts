const energyConsumptionTypes = [
	'selfCPUEnergyConsumption',
	'aggregatedCPUEnergyConsumption',
	'internCPUEnergyConsumption',
	'externCPUEnergyConsumption',
	'langInternalCPUEnergyConsumption',
	'selfRAMEnergyConsumption',
	'aggregatedRAMEnergyConsumption',
	'internRAMEnergyConsumption',
	'externRAMEnergyConsumption',
	'langInternalRAMEnergyConsumption'
]
export class NumberHelper {
	static round(value: number, valueType: string, 
		unit: string): { newValue: string, newUnit: string } {
		let newValue
		const newUnit = unit

		if (energyConsumptionTypes.includes(valueType)) {
			const roundedValue = (Math.round(value * 1000) / 1000).toFixed(2)
			newValue = roundedValue === '0.00' ? '0' : roundedValue.toString()
		} else {
			newValue = value.toString()
		}

		return { newValue, newUnit }
	}
}