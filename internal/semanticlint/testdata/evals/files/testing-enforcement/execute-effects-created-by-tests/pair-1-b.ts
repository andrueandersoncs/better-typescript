import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import { loadInvoice } from "../src/loadInvoice"

describe("loadInvoice", () => {
  it("returns the invoice assigned to the account", async () => {
    const program = loadInvoice("inv-102").pipe(
      Effect.tap((invoice) =>
        Effect.sync(() => expect(invoice.accountId).toBe("acct-7"))
      )
    )

    await Effect.runPromise(program)
  })
})
