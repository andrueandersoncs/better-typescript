import { describe, expect, it } from "vitest"

function createClient() {
  let connected = false

  return {
    connect() {
      return new Promise<void>((resolve) => {
        queueMicrotask(() => {
          connected = true
          resolve()
        })
      })
    },
    connected: () => connected
  }
}

describe("connection setup", () => {
  it("opens a client connection", async () => {
    const client = createClient()
    await client.connect()

    expect(client.connected()).toBe(true)
  })
})
