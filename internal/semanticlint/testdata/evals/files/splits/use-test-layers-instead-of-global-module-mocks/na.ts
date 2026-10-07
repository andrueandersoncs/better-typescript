import { describe, expect, it } from "vitest"

const receiptNumber = (sequence: number): string => {
  return `receipt-${sequence}`
}

const isReceiptNumber = (value: string): boolean => {
  return value.startsWith("receipt-")
}

describe("receipt numbers", () => {
  it("formats a receipt sequence", () => {
    const number = receiptNumber(3)
    const formatted = isReceiptNumber(number)
    expect(formatted).toBe(true)
  })
})
