export type WindowRange = {
  readonly startsAt: Date
  readonly endsAt: Date
}

export const measureWindowMinutes = (window: WindowRange): number => {
  const startMillis = window.startsAt.getTime()
  const endMillis = window.endsAt.getTime()
  const durationMillis = endMillis - startMillis
  return durationMillis / 60_000
}

export const isWindowOpen = (window: WindowRange, now: Date): boolean => {
  return now >= window.startsAt && now <= window.endsAt
}
