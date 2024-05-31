# How to interpret Measurements

The Oaklean VS Code Extension provides insights into the resource consumption of your NodeJS/TypeScript application. In the following sections, we will explain how to interpret the measurements related to resource consumption.

> ⚠️ We use "Sensor Values" and "Measurements" synonymously.

# Execution Scopes
To better understand where high resource usage originates, we categorize the measurements as follows:
- **internal:** Code of the project being measured.
- **external:** Code of a Node module that is imported and used in the project being measured.
- **langInternal:** Code of the programming language itself or standard libraries integrated into the Node runtime environment.

# Sensor Value Types

![Sensor Values](../images/docs/sensor-values-overview.png)

To interpret sensor values, we should look at their naming conventions. Except for the value **profilerHits**, each sensor value follows this naming convention:
`<prefix><type-of-resource>`

> **profilerHits**: In addition to resource consumption values, there is a measurement value called **profilerHits**. This does not describe a resource used by the application but rather how often the CPU profiler, used to measure CPU time, detected a certain source code location.

### Prefixes
There are currently five prefixes:
- **self:** Indicates how much resource consumption originates from the source code location itself.
- **internal:** Indicates how much resource consumption originates from the invocation of internal functions.
- **external:** Indicates how much resource consumption originates from the invocation of external functions.
- **langInternal:** Indicates how much resource consumption originates from the invocation of langInternal functions.
- **aggregated:** Includes all the above categories.

### Types of Resources

Currently, three types of resources are measured:
- **CPU time**
- **CPU energy consumption**
- **RAM energy consumption**

### Example
Sensor values are stored at specific source code locations. In the example below, we interpret the sensor values of the method `isProgramStructureType`.

![Sensor Values](../images/docs/sensor-values-overview.png)

Given the example above, the measurements describe the following:

| Sensor Value Type                | Description |
|----------------------------------|-------------|
| **self**CPUEnergyConsumption         | How much CPU energy was consumed by the method `isProgramStructureType` **itself**.            |
| **intern**CPUEnergyConsumption       | How much CPU energy was consumed by **internal** methods that were directly or indirectly called by the method `isProgramStructureType`.            |
| **extern**CPUEnergyConsumption       | How much CPU energy was consumed by **external** methods that were directly or indirectly called by the method `isProgramStructureType`.            |
| **langInternal**CPUEnergyConsumption | How much CPU energy was consumed by **langInternal** methods that were directly or indirectly called by the method `isProgramStructureType`.            |
| **aggregated**CPUEnergyConsumption   | How much CPU energy was consumed in total; this is the sum of all the values above.            |




