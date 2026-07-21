import { Effect } from "effect"

interface Settings {
  readonly mode: string
}

const readSettings: Effect.Effect<Settings> = Effect.succeed({ mode: "strict" })

export const loadSettings = (): Effect.Effect<Settings> => readSettings
