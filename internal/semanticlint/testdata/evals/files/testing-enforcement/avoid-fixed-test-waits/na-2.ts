import { describe, expect, it } from "vitest"

describe("permission names", () => {
  it("orders permission names alphabetically", () => {
    const permissions = ["write", "read", "delete"]
    const ordered = permissions.toSorted()

    expect(ordered).toEqual(["delete", "read", "write"])
  })

  it("does not mutate the source list", () => {
    const permissions = ["write", "read"]
    permissions.toSorted()

    expect(permissions).toEqual(["write", "read"])
  })
})
