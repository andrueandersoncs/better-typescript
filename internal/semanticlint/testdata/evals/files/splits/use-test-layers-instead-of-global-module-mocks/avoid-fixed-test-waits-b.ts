import { describe, expect, it } from "vitest"
import { requestInvoice, waitForInvoiceStatus } from "../src/InvoiceWorkflow"

const invoiceId = "inv-2"
const availableStatus = "available"

describe("invoice workflow", () => {
  it("makes an invoice available after requesting it", async () => {
    await requestInvoice(invoiceId)
    const status = await waitForInvoiceStatus(invoiceId)
    expect(status).toBe(availableStatus)
  })
})
