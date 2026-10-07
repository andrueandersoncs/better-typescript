import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import { refreshExchangeRates } from "../src/refreshExchangeRates"

describe("refreshExchangeRates", () => {
  it("stores the rate supplied by the provider", async () => {
    const refresh = refreshExchangeRates("2025-05-21").pipe(
      Effect.map((rates) => {
        expect(rates.USD).toBe(1)
        expect(rates.EUR).toBe(0.92)
      })
    )

    await Effect.runPromise(refresh)
  })
})
