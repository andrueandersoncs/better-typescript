import { Effect, pipe } from "effect"
export const value = pipe(Effect.succeed(1), Effect.map((n) => n + 1))
