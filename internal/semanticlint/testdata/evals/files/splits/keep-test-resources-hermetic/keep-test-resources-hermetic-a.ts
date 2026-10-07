import { describe, expect, it } from "vitest"
import { createDatabase } from "../src/TestDatabase"

describe("invoice storage", () => {
  it("stores an invoice in the test database", async () => {
    const database = await createDatabase("invoices")
    try {
      const invoiceId = await database.insertInvoice("inv-1")
      expect(invoiceId).toBe("inv-1")
    } finally {
      await database.close()
    }
  })
})
