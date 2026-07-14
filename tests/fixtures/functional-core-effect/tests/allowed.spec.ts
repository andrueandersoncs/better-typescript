import { Effect } from "effect"

export const result = Effect.runPromise(Effect.succeed("test"))
