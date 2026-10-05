import * as Schema from "effect/Schema"

const ProfileSchema = Schema.Struct({
  email: Schema.String,
  visits: Schema.Number
})

type Profile = Schema.Schema.Type<typeof ProfileSchema>

type Store = { readonly read: (key: string) => unknown }

export const loadProfile = (store: Store, key: string): Profile => {
  const value = store.read(key)
  return Schema.decodeUnknownSync(ProfileSchema)(value)
}

export const profileFields = ProfileSchema
