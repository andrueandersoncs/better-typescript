import * as Effect from "effect/Effect"

type ReportDate = {
  readonly year: number
  readonly month: number
  readonly day: number
}

export const parseReportDate = (text: string): Effect.Effect<ReportDate, Error> => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (match === null) {
    return Effect.fail(new Error(`Invalid date: ${text}`))
  }
  return Effect.succeed({
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  })
}
