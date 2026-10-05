import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

class ReportDateMalformed extends Schema.TaggedError<ReportDateMalformed>()("ReportDateMalformed", {
  value: Schema.String
}) {}

type ReportDate = {
  readonly year: number
  readonly month: number
  readonly day: number
}

export const parseReportDate = (text: string): Effect.Effect<ReportDate, ReportDateMalformed> => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (match === null) {
    return Effect.fail(new ReportDateMalformed({ value: text }))
  }
  return Effect.succeed({
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  })
}
