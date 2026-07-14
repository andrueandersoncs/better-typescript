import type { DomainIdentity, WireIdentity } from "./data.js"

export const toDomainIdentity = (
  identity: WireIdentity
): DomainIdentity => ({
  sharedIdentityValue: identity.sharedIdentityValue
})
