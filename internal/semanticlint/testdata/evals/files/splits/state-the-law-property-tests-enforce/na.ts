import { describe, expect, it } from "vitest"

const receiptTitle = (invoiceId: string): string => {
  return `Receipt for ${invoiceId}`
}

const isReceiptTitle = (value: string): boolean => {
  return value.startsWith("Receipt")
}

describe("receipt titles", () => {
  it("formats a receipt title", () => {
    const title = receiptTitle("inv-9")
    const formatted = isReceiptTitle(title)
    expect(formatted).toBe(true)
  })
})
