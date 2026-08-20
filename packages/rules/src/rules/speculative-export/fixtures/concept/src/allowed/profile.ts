import type { SharedProfile } from "./data.js"

export const profileName = (profile: SharedProfile): string =>
  profile.profileDisplayName

export const profileActive = (profile: SharedProfile): boolean =>
  profile.profileIsActive
