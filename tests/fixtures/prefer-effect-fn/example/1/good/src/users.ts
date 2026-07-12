import { Effect } from "effect"

declare const fetchUser: (id: string) => Effect.Effect<{ readonly id: string }>

export const getUser = Effect.fn("getUser")(function* (id: string) {
  return yield* fetchUser(id)
})
