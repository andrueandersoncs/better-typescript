import * as Schema from "effect/Schema"

const ProfileSchema = Schema.Struct({
  email: Schema.String,
  visits: Schema.Number
})

type Profile = {
  readonly email: string
  readonly visits: number
}

type Store = { readonly read: (key: string) => unknown }

export const loadProfile = (store: Store, key: string): Profile => {
  const value = store.read(key)
  return value as Profile
}

export const profileFields = ProfileSchema
