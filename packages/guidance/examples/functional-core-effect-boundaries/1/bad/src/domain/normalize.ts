import { Effect } from "effect"

export const normalize = (input: string): Effect.Effect<string> => Effect.succeed(input.trim())
