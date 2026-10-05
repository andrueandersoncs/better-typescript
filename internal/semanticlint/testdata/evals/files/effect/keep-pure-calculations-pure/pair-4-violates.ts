import * as Effect from "effect/Effect"

type Quantity = {
  readonly sku: string
  readonly count: number
}

type InputIssue = {
  readonly _tag: "InputIssue"
  readonly field: string
  readonly text: string
}

export const checkQuantity = Effect.fn(function*(value: Quantity) {
  if (value.count < 0) {
    return { _tag: "InputIssue", field: "count", text: "must be nonnegative" } as const
  }
  return value
})
