import { Effect, Struct } from "effect"

declare const userId: string
declare const fetchUser: (id: string) => Effect.Effect<{ readonly id: string }>
declare const loadProfile: (
  id: string
) => Effect.Effect<{ readonly bio: string }>

export const program = fetchUser(userId).pipe(
  Effect.map(Struct.get("id")),
  Effect.flatMap(loadProfile)
)
