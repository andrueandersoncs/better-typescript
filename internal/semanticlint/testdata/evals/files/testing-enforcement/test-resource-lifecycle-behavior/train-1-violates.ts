import { describe, expect, it } from "vitest"
import { createPool } from "../src/pool"
import { withConnection } from "../src/withConnection"
import { fakeDriver } from "./fakeDriver"

describe("withConnection", () => {
  it("returns the query result", async () => {
    const pool = createPool({ driver: fakeDriver({ rows: [{ id: 1 }] }), size: 2 })

    const rows = await withConnection(pool, (conn) => conn.query("select id from users"))

    expect(rows).toEqual([{ id: 1 }])
  })

  it("propagates query errors", async () => {
    const pool = createPool({ driver: fakeDriver({ failWith: new Error("boom") }), size: 2 })

    await expect(withConnection(pool, (conn) => conn.query("select 1"))).rejects.toThrow("boom")
  })
})
