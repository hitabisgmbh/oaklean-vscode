import { ISensorValues } from '@oaklean/profiler-core'

export type SensorValueType = keyof Required<ISensorValues>

export enum SensorUnits {
	flat = '',
	seconds = 's',
	milliSeconds = 'ms',
	microSeconds = 'µs',
	milliJoule = 'mJ'
}

type SensorValueToNameMap = {
	[key in ExtendedSensorValueType]: string;
};



export const SensorValueTypeNames: SensorValueToNameMap = {
	profilerHits: 'profilerHits',

	selfCPUTime: 'CPU Time (self)',
	aggregatedCPUTime: 'CPU Time (summed up)',
	internCPUTime: 'CPU Time (own code)',
	externCPUTime: 'CPU Time (libraries)',
	langInternalCPUTime: 'CPU Time (node internal)',

	selfCPUEnergyConsumption: 'Energy Consumption (self)',
	aggregatedCPUEnergyConsumption: 'Energy Consumption (summed up)',
	internCPUEnergyConsumption: 'Energy Consumption (own code)',
	externCPUEnergyConsumption: 'Energy Consumption (libraries)',
	langInternalCPUEnergyConsumption: 'Energy Consumption (node internal)',

	selfRAMEnergyConsumption: 'RAM Energy Consumption (self)',
	aggregatedRAMEnergyConsumption: 'RAM Energy Consumption (summed up)',
	internRAMEnergyConsumption: 'RAM Energy Consumption (own code)',
	externRAMEnergyConsumption: 'RAM Energy Consumption (libraries)',
	langInternalRAMEnergyConsumption: 'RAM Energy Consumption (node internal)',

	customFormula: 'customFormula'
}


export type ExtendedSensorValueType = SensorValueType | 'customFormula'

export const ExtendedSensorValueTypeNames: SensorValueToNameMap & { customFormula: string } = {
	...SensorValueTypeNames,
	customFormula: 'customFormula'
}

type SensorValueToUnitMap = {
	[key in ExtendedSensorValueType]: SensorUnits;
};

export const UnitPerSensorValue: SensorValueToUnitMap = {
	profilerHits: SensorUnits.flat,

	selfCPUTime: SensorUnits.microSeconds,
	aggregatedCPUTime: SensorUnits.microSeconds,
	internCPUTime: SensorUnits.microSeconds,
	externCPUTime: SensorUnits.microSeconds,
	langInternalCPUTime: SensorUnits.microSeconds,

	selfCPUEnergyConsumption: SensorUnits.milliJoule,
	aggregatedCPUEnergyConsumption: SensorUnits.milliJoule,
	internCPUEnergyConsumption: SensorUnits.milliJoule,
	externCPUEnergyConsumption: SensorUnits.milliJoule,
	langInternalCPUEnergyConsumption: SensorUnits.milliJoule,

	selfRAMEnergyConsumption: SensorUnits.milliJoule,
	aggregatedRAMEnergyConsumption: SensorUnits.milliJoule,
	internRAMEnergyConsumption: SensorUnits.milliJoule,
	externRAMEnergyConsumption: SensorUnits.milliJoule,
	langInternalRAMEnergyConsumption: SensorUnits.milliJoule,

	customFormula: SensorUnits.flat
}

export const EnergyConsumptionSensorValueTypes = Object.keys(UnitPerSensorValue).filter(
	(key) => UnitPerSensorValue[key as ExtendedSensorValueType] === SensorUnits.milliJoule
) as ExtendedSensorValueType[]