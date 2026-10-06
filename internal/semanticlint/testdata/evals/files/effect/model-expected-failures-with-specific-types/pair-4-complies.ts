import * as Effect from "effect/Effect"

class ProfileAbsent {
  readonly _tag = "ProfileAbsent"
  constructor(readonly userId: string) {}
}

type Profile = {
  readonly userId: string
  readonly displayName: string
}

const lookupProfile = (userId: string): Effect.Effect<Profile, ProfileAbsent> =>
  Effect.fail(new ProfileAbsent(userId))

export const getProfile = (userId: string): Effect.Effect<Profile, ProfileAbsent> =>
  lookupProfile(userId)
