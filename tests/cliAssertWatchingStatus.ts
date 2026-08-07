import * as assert from "node:assert/strict"

export const assertWatchingStatus = (stderr: string, rootPath: string): void => {
  assert.ok(stderr.includes(`Watching ${rootPath} for changes.`))
  assert.doesNotMatch(stderr, /Analyzing/)
}
