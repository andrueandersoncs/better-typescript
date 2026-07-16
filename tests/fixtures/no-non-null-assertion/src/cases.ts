interface Profile {
  name?: string
}

declare const profile: Profile

export const bareName = profile.name! // ~detect 25

export const upperName = profile.name!.toUpperCase() // ~detect 26
