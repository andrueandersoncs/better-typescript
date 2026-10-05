import { describe, expect, it } from "vitest"

async function record(kind: "accepted" | "ignored", received: Array<string>) {
  await Promise.resolve()
  if (kind === "accepted") {
    received.push("message")
  }
}

describe("inbound records", () => {
  it("does not retain ignored records", async () => {
    const received: Array<string> = []
    const processing = record("ignored", received)

    await processing
    expect(received).toEqual([])
  })

  it("retains accepted records", async () => {
    const received: Array<string> = []
    await record("accepted", received)

    expect(received).toEqual(["message"])
  })
})
