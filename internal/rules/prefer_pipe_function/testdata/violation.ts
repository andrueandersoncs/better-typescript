import { Effect } from "effect"
export const value = Effect.succeed(1).pipe(Effect.map((n) => n + 1))
