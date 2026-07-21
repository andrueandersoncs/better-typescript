import { Effect } from "effect"

type Users = {
  readonly fetchUser: (id: string) => Effect.Effect<{ readonly id: string }>
}

declare const users: Users

export const getUser = (id: string) =>
  Effect.gen({ self: users }, function* (this: Users) {
    return yield* this.fetchUser(id)
  })
