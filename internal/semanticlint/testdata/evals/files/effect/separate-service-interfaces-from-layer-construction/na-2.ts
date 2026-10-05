type TimeWindow = {
  readonly opensAt: Date
  readonly closesAt: Date
}

const contains = (window: TimeWindow, instant: Date): boolean => {
  return window.opensAt <= instant && instant < window.closesAt
}

const workingHours: TimeWindow = {
  opensAt: new Date("2026-01-01T09:00:00Z"),
  closesAt: new Date("2026-01-01T17:00:00Z")
}

export const isOpen = (instant: Date): boolean => {
  return contains(workingHours, instant)
}
