import { describe, expect, it } from "vitest"

function createClient() {
  let connected = false

  return {
    connect() {
      queueMicrotask(() => {
        connected = true
      })
    },
    connected: () => connected
  }
}

describe("connection setup", () => {
  it("opens a client connection", async () => {
    const client = createClient()
    client.connect()
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(client.connected()).toBe(true)
  })
})
