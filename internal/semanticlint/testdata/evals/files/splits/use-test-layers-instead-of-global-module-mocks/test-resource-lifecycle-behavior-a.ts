import { describe, expect, it } from "vitest"
import { openDeliveryStream } from "../src/DeliveryStream"

const invoiceId = "inv-3"

describe("delivery stream", () => {
  it("receives a sent invoice", async () => {
    const stream = await openDeliveryStream()
    const receipt = await stream.receive(invoiceId)
    expect(receipt.invoiceId).toBe(invoiceId)
    await stream.close()
  })
})
