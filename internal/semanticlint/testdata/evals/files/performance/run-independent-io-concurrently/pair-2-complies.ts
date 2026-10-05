import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"

type Workspace = {
  readonly preferences: string
  readonly palette: string
}

export const readWorkspace = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const [preferences, palette] = yield* Effect.all([
    fs.readFileString(".workspace/preferences.json"),
    fs.readFileString(".workspace/palette.json")
  ], { concurrency: "unbounded" })

  return { preferences, palette } satisfies Workspace
})
