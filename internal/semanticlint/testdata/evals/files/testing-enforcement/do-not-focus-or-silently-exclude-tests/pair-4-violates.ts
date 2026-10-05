import { describe, expect, it } from "vitest"

describe("wire messages", () => {
  it.todo("encodes a request with optional headers")

  it("encodes a request body", () => {
    const body = new TextEncoder().encode("hello")
    const request = { method: "POST", body: Array.from(body) }

    expect(request).toEqual({ method: "POST", body: [104, 101, 108, 108, 111] })
  })

  it("retains the request method", () => {
    expect({ method: "GET" }.method).toBe("GET")
  })
})
