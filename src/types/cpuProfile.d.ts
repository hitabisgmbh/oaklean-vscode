export type ICPUUsageOfLine = {
  lineNumber: number,
  selfTime: number,
  aggregatedTime: number,
  selfTimeRelative: number,
  aggregatedTimeRelative: number,
}

export type ICPUUsage = {
  selfTime: number,
  aggregatedTime: number,
}