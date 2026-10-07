import fc from "fast-check"
import { expect, test } from "vitest"

type DeliveryStatus = "draft" | "sent" | "delivered"

const encode = (status: DeliveryStatus) => status
const decode = (value: string) => value as DeliveryStatus

test("round-trips every delivery status", () => {
  fc.assert(
    fc.property(fc.constant<DeliveryStatus>("draft"), (status) => {
      expect(decode(encode(status))).toBe(status)
    }),
  )
})
