import { Effect } from "effect"

type Users = {
  readonly fetchUser: (id: string) => Effect.Effect<{ readonly id: string }>
}

declare const users: Users

export const getUser = Effect.fn("getUser")({ self: users }, function* (this: Users, id: string) {
  return yield* this.fetchUser(id)
})
