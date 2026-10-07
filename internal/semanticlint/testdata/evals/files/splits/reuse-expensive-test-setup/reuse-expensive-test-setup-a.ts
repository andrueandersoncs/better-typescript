import { describe, expect, it } from "vitest"
import { createServer } from "../src/TestServer"

describe("invoice endpoint", () => {
  it("returns an invoice by identifier", async () => {
    const server = await createServer()
    try {
      const response = await server.getInvoice("inv-1")
      expect(response.status).toBe(200)
    } finally {
      await server.close()
    }
  })

  it("returns a missing response for an unknown invoice", async () => {
    const server = await createServer()
    try {
      const response = await server.getInvoice("missing")
      expect(response.status).toBe(404)
    } finally {
      await server.close()
    }
  })
})
