import { describe, expect, it } from "vitest"

type Order = {
  readonly id: string
  readonly amount: number
}

const hasOrderShape = (
  input: unknown,
): input is { readonly id: unknown; readonly amount: unknown } => {
  return typeof input === "object" && input !== null
}

const decodeOrder = (input: unknown): Order | undefined => {
  if (!hasOrderShape(input)) return undefined
  const { id, amount } = input
  if (typeof id !== "string") return undefined
  if (typeof amount !== "number" || amount < 0) return undefined
  return { id, amount }
}

describe("order charges", () => {
  it("rejects a negative order amount", () => {
    const input = { id: "order-1", amount: -1 }
    const order = decodeOrder(input)
    expect(order).toBeUndefined()
  })
})
