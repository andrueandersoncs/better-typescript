import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import { reserveInventory } from "../src/reserveInventory"

describe("reserveInventory", () => {
  it("holds every requested unit", async () => {
    const program = reserveInventory({
      sku: "wireless-keyboard",
      quantity: 3
    }).pipe(
      Effect.tap((reservation) =>
        Effect.sync(() => expect(reservation.quantity).toBe(3))
      )
    )

    await Effect.runPromise(program)
  })
})
