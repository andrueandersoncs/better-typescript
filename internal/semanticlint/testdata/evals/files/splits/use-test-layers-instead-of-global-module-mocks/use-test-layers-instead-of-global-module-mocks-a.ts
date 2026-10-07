import { describe, expect, it, vi } from "vitest"
import { sendInvoiceReceipt } from "../src/SendInvoiceReceipt"

vi.mock("../src/ReceiptMailer", () => {
  return { sendReceipt: vi.fn(() => Promise.resolve()) }
})

describe("invoice receipts", () => {
  it("sends a receipt after payment", async () => {
    const result = await sendInvoiceReceipt("inv-1")
    expect(result).toEqual({ delivered: true })
  })
})
