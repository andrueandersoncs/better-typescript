import { Effect } from "effect"

interface User {
  readonly id: string
}

interface Profile {
  readonly displayName: string
}

declare const userId: string
declare const fetchUser: (id: string) => Effect.Effect<User>
declare const loadProfile: (id: string) => Effect.Effect<Profile>
declare const renderProfile: (profile: Profile) => string

export const program = Effect.gen(function* () {
  const user = yield* fetchUser(userId)
  const profile = yield* loadProfile(user.id)

  return renderProfile(profile)
})
