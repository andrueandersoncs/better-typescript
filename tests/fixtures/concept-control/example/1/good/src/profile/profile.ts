import type { Profile } from "./data.js"

export const profileLabel = (profile: Profile): string => profile.displayName
export const profileAllowed = (profile: Profile): boolean => profile.active
