export type RetryConfig = {
  readonly retryLimit: number
}

export const calculateRetryAttempts = (config: RetryConfig): number => {
  return config.retryLimit
}

export const formatRetryPlan = (config: RetryConfig): string => {
  const attempts = calculateRetryAttempts(config)
  return `${attempts} attempts`
}

export const describeRetryPlan = (): string => {
  return "Retries are configured for this operation"
}
