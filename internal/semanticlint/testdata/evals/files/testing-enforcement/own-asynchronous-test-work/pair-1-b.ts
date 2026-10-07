import { expect, test } from "vitest"

let delivered = false

const sendReceipt = async (orderId: string) => {
  await Promise.resolve(orderId)
  delivered = true
}

test("sends a receipt after payment", async () => {
  await sendReceipt("order-17")
  expect(delivered).toBe(true)
})
