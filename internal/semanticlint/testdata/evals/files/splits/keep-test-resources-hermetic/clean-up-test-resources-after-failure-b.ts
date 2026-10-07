import { describe, expect, it } from "vitest"
import { createDatabase, createDatabaseName } from "../src/TestDatabase"

describe("invoice storage", () => {
  it("counts stored invoices", async () => {
    const databaseName = createDatabaseName()
    const database = await createDatabase(databaseName)
    try {
      const invoiceId = await database.insertInvoice("inv-2")
      const invoiceCount = await database.countInvoices()
      expect(invoiceId).toBe("inv-2")
      expect(invoiceCount).toBe(1)
    } finally {
      await database.close()
    }
  })
})
