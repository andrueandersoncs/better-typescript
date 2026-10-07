export type DateRange = {
  readonly start: Date
  readonly end: Date
}

const millisecondsPerDay = 86_400_000

const elapsedMilliseconds = (range: DateRange): number => {
  const endTime = range.end.getTime()
  const startTime = range.start.getTime()

  return endTime - startTime
}

export const countDaysInRange = (range: DateRange): number => {
  const elapsed = elapsedMilliseconds(range)

  return Math.ceil(elapsed / millisecondsPerDay)
}
