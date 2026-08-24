import { Effect } from "effect"
export const fetchUser = Effect.fn("User.fetch")(function* () { return yield* Effect.succeed("user") })
