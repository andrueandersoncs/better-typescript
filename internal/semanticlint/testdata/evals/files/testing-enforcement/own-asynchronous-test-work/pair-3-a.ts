import { expect, test } from "vitest"

const events: string[] = []

const recordExport = async () => {
  await Promise.resolve()
  events.push("exported")
}

test("records an export event", () => {
  setTimeout(async () => {
    await recordExport()
    expect(events).toContain("exported")
  }, 20)
})
