export type Duration = {
  readonly milliseconds: number
}

export const calculateMinutes = (duration: Duration): number => {
  return duration.milliseconds / 60_000
}

export const formatDuration = (duration: Duration): string => {
  const minutes = calculateMinutes(duration)
  return `${minutes.toFixed(1)} minutes`
}

export const formatDurationLabel = (): string => {
  return "Duration"
}
