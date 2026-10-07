import { expect, test } from "vitest"

const events: string[] = []

const recordExport = async () => {
  await Promise.resolve()
  events.push("exported")
}

test("records an export event", async () => {
  await new Promise((resolve) => setTimeout(resolve, 20))
  await recordExport()
  expect(events).toContain("exported")
})
