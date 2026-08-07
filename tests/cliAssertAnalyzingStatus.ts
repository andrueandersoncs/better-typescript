import * as assert from "node:assert/strict"

export const assertAnalyzingStatus = (stderr: string, rootPath: string): void => {
  assert.ok(stderr.includes(`Analyzing ${rootPath}.`))
  assert.doesNotMatch(stderr, /Watching/)
}
