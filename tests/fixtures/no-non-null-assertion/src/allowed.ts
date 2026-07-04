import { Option } from "effect"

interface Profile {
  name?: string
}

declare const profile: Profile

const maybeName = Option.fromNullable(profile.name)

export const displayName = Option.getOrElse(maybeName, () => "anonymous")

export const legacyGlobal = 1
