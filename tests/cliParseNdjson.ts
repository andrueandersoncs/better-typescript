import * as assert from "node:assert/strict"

export const parseNdjson = (stdout: string): ReadonlyArray<Record<string, unknown>> => {
  const lines = stdout.split(/\r?\n/).filter((line) => line.length > 0)

  assert.ok(lines.length > 0, "expected stdout to contain NDJSON events")

  return lines.map((line) => JSON.parse(line) as Record<string, unknown>)
}
