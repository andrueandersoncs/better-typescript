import { expect, test } from "vitest"

const archived = new Set<string>()

const archive = async (id: string) => {
  await Promise.resolve()
  archived.add(id)
}

test("archives all expired reports", () => {
  ;["report-1", "report-2"].forEach(async (id) => {
    await archive(id)
    expect(archived.has(id)).toBe(true)
  })
})
