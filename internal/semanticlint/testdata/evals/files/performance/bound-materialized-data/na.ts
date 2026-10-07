type RetrySettings = {
  readonly attempts: number
  readonly delayMilliseconds: number
}

const serializedDefaults = "{\"attempts\":3,\"delayMilliseconds\":250}"

export const defaultRetrySettings = (): RetrySettings => {
  const settings = JSON.parse(serializedDefaults) as RetrySettings
  if (settings.attempts < 1) {
    throw new Error("Retry attempts must be positive")
  }
  return settings
}
