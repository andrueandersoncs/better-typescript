import * as Effect from "effect/Effect"

type DailyCount = {
  readonly date: Date
  readonly count: number
}

type ChartPoint = {
  readonly label: string
  readonly value: number
}

export const toChartPoints = Effect.fn(function*(counts: ReadonlyArray<DailyCount>) {
  return counts.map((count) => ({
    label: count.date.toISOString().slice(0, 10),
    value: count.count
  }))
})
