import { Effect, Struct, pipe } from "effect"

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

export const program = pipe(
  fetchUser(userId),
  Effect.map(Struct.get("id")),
  Effect.flatMap(loadProfile),
  Effect.map(renderProfile)
)
