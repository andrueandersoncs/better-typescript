interface WireIdentity { value: string }
interface DomainIdentity { value: string }
export const toDomain = (identity: WireIdentity): DomainIdentity => ({ value: identity.value });
export const clean = (identity: WireIdentity): DomainIdentity => ({ value: identity.value.trim() });
