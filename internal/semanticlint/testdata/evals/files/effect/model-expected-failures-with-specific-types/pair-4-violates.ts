import * as Effect from "effect/Effect"

class ProfileAbsent {
  readonly _tag = "ProfileAbsent"
  constructor(readonly userId: string) {}
}

type Profile = {
  readonly userId: string
  readonly displayName: string
}

type ProfileCard =
  | { readonly kind: "profile"; readonly profile: Profile }
  | { readonly kind: "empty" }

const lookupProfile = (userId: string): Effect.Effect<Profile, ProfileAbsent> =>
  Effect.fail(new ProfileAbsent(userId))

export const getProfile = (userId: string): Effect.Effect<ProfileCard> =>
  lookupProfile(userId).pipe(
    Effect.map((profile) => ({ kind: "profile", profile }) as const),
    Effect.catchTag("ProfileAbsent", () => Effect.succeed({ kind: "empty" } as const))
  )
