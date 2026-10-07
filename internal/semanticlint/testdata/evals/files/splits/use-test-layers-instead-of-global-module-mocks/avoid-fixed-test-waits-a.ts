import { describe, expect, it } from "vitest"
import { getInvoiceStatus, requestInvoice } from "../src/InvoiceWorkflow"

const invoiceId = "inv-2"
const availableStatus = "available"

describe("invoice workflow", () => {
  it("makes an invoice available after requesting it", async () => {
    await requestInvoice(invoiceId)
    await new Promise<void>((resolve) => setTimeout(resolve, 50))
    const status = await getInvoiceStatus(invoiceId)
    expect(status).toBe(availableStatus)
  })
})
