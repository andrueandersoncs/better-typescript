import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"

type Workspace = {
  readonly preferences: string
  readonly palette: string
}

export const readWorkspace = Effect.gen(function*() {
  const fs = yield* FileSystem.FileSystem
  const preferences = yield* fs.readFileString(".workspace/preferences.json")
  const palette = yield* fs.readFileString(".workspace/palette.json")

  return { preferences, palette } satisfies Workspace
})
