import * as Schema from "effect/Schema"

const AdjustmentSchema = Schema.Struct({
  orderId: Schema.String,
  amount: Schema.Number
})

type Adjustment = {
  readonly orderId: string
  readonly amount: number
}

const apply = (adjustment: Adjustment): number => adjustment.amount

export const handleAdjustment = (body: unknown): number => {
  const adjustment = body as Adjustment
  return apply(adjustment)
}

export const adjustmentFields = AdjustmentSchema
