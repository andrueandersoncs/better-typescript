import * as Effect from "effect/Effect"

type RecordRow = {
  readonly account: string
  readonly amount: number
}

type Batch = {
  readonly rows: ReadonlyArray<RecordRow>
  readonly period: string
}

export const renderBatch = (batch: Batch) => {
  const manifest = JSON.stringify({ rows: batch.rows.length })
  return Effect.succeed({ period: batch.period, manifest })
}
