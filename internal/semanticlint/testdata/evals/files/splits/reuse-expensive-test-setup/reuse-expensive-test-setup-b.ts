import { afterAll, describe, expect, it } from "vitest"
import { createServer } from "../src/TestServer"

const server = await createServer()

afterAll(async () => {
  await server.close()
})

describe("invoice endpoint", () => {
  it("returns an invoice by identifier", async () => {
    const response = await server.getInvoice("inv-1")
    expect(response.status).toBe(200)
  })

  it("returns a missing response for an unknown invoice", async () => {
    const response = await server.getInvoice("missing")
    expect(response.status).toBe(404)
  })
})
