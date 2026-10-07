type DateRange = {
  readonly start: Date
  readonly end: Date
}

export const durationInDays = (range: DateRange): number => {
  const milliseconds = range.end.getTime() - range.start.getTime()
  return milliseconds / 86_400_000
}

export const startsOn = (range: DateRange): string =>
  range.start.toISOString()

export const endsOn = (range: DateRange): string =>
  range.end.toISOString()
