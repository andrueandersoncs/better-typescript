import * as fs from "node:fs"
import { Effect } from "effect"
import { ExampleLoadError } from "./exampleLoadError.js"

export const collectDirectoryEntries = Effect.fn("Example.collectDirectoryEntries")(function* (
  directory: string
) {
  return yield* Effect.try({
    try: () => fs.readdirSync(directory, { withFileTypes: true }),
    catch: () =>
      new ExampleLoadError({
        message: `Unable to read example directory: ${directory}`
      })
  })
})
