type HealthReport = {
  readonly service: string
  readonly healthy: boolean
}

export const summarizeHealth = (reports: readonly HealthReport[]): string => {
  const unhealthy = reports.filter((report) => !report.healthy)
  if (unhealthy.length === 0) {
    return "all services healthy"
  }
  return unhealthy.map((report) => report.service).join(", ")
}
