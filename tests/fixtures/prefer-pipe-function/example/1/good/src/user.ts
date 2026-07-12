import { Effect, Struct, pipe } from "effect"

declare const userId: string
declare const fetchUser: (id: string) => Effect.Effect<{ readonly id: string }>
declare const loadProfile: (
  id: string
) => Effect.Effect<{ readonly bio: string }>

export const program = pipe(
  fetchUser(userId),
  Effect.map(Struct.get("id")),
  Effect.flatMap(loadProfile)
)
