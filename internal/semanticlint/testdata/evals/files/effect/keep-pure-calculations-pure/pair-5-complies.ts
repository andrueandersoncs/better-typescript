type DailyCount = {
  readonly date: Date
  readonly count: number
}

type ChartPoint = {
  readonly label: string
  readonly value: number
}

export const toChartPoints = (counts: ReadonlyArray<DailyCount>): ReadonlyArray<ChartPoint> => {
  return counts.map((count) => ({
    label: count.date.toISOString().slice(0, 10),
    value: count.count
  }))
}
