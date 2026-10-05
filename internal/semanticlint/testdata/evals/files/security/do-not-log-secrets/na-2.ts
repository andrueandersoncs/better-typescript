type Schedule = {
  readonly start: Date
  readonly end: Date
}

export const durationInMinutes = (schedule: Schedule): number => {
  const milliseconds = schedule.end.getTime() - schedule.start.getTime()
  return Math.max(0, Math.round(milliseconds / 60_000))
}
