import { Schema } from "effect"

// NoPrimitiveArrayConstructorsFact is empty payload because guidance and matchers share identity.
export const NoPrimitiveArrayConstructorsFact = Schema.Struct({})

export interface NoPrimitiveArrayConstructorsFact extends Schema.Schema.Type<
  typeof NoPrimitiveArrayConstructorsFact
> {}

// emptyNoPrimitiveArrayConstructorsFact is shared empty fact because matchers share identity.
export const emptyNoPrimitiveArrayConstructorsFact = NoPrimitiveArrayConstructorsFact.make({})
