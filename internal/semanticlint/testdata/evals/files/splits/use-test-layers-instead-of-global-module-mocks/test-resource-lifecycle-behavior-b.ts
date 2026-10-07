import { describe, expect, it } from "vitest"
import { openDeliveryStream } from "../src/DeliveryStream"

describe("delivery stream", () => {
  it("releases its owned stream after interruption", async () => {
    const stream = await openDeliveryStream()
    const owner = stream.ownerId()
    const receipt = await stream.receive("inv-3")
    const interrupted = await stream.interrupt()
    const closed = await stream.close()
    expect(owner).toBeDefined()
    expect(receipt.invoiceId).toBe("inv-3")
    expect(interrupted).toBe(true)
    expect(closed).toBe(true)
  })
})
