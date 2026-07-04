interface Profile {
  name?: string
}

declare const profile: Profile

export const bareName = profile.name!

export const upperName = profile.name!.toUpperCase()
