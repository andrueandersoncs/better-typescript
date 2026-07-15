import { Effect, FileSystem } from "effect"
import { readFileSync } from "node:fs"

export const configText = readFileSync("config.json", "utf8")

export const remoteValue = Effect.tryPromise({
  try: () => fetch("https://example.com"),
  catch: (error) => error
})

export const platformFs = FileSystem.FileSystem
