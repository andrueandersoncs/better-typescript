import * as Schema from "effect/Schema"

const AdjustmentSchema = Schema.Struct({
  orderId: Schema.String,
  amount: Schema.Number
})

type Adjustment = Schema.Schema.Type<typeof AdjustmentSchema>

const apply = (adjustment: Adjustment): number => adjustment.amount

export const handleAdjustment = (body: unknown): number => {
  const adjustment = Schema.decodeUnknownSync(AdjustmentSchema)(body)
  return apply(adjustment)
}

export const adjustmentFields = AdjustmentSchema
