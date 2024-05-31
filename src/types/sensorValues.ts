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

	selfCPUTime: 'selfCPUTime',
	aggregatedCPUTime: 'aggregatedCPUTime',
	internCPUTime: 'internCPUTime',
	externCPUTime: 'externCPUTime',
	langInternalCPUTime: 'langInternalCPUTime',

	selfCPUEnergyConsumption: 'selfCPUEnergyConsumption',
	aggregatedCPUEnergyConsumption: 'aggregatedCPUEnergyConsumption',
	internCPUEnergyConsumption: 'internCPUEnergyConsumption',
	externCPUEnergyConsumption: 'externCPUEnergyConsumption',
	langInternalCPUEnergyConsumption: 'langInternalCPUEnergyConsumption',

	selfRAMEnergyConsumption: 'selfRAMEnergyConsumption',
	aggregatedRAMEnergyConsumption: 'aggregatedRAMEnergyConsumption',
	internRAMEnergyConsumption: 'interRAMEnergyConsumption',
	externRAMEnergyConsumption: 'externRAMEnergyConsumption',
	langInternalRAMEnergyConsumption: 'langInternalRAMEnergyConsumption',

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