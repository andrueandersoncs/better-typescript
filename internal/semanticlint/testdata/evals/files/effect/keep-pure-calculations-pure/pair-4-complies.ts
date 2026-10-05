type Quantity = {
  readonly sku: string
  readonly count: number
}

type InputIssue = {
  readonly _tag: "InputIssue"
  readonly field: string
  readonly text: string
}

export const checkQuantity = (value: Quantity): Quantity | InputIssue => {
  if (value.count < 0) {
    return { _tag: "InputIssue", field: "count", text: "must be nonnegative" }
  }
  return value
}
