import { Array, Schema } from "effect"

const optionalClaimKind = Schema.Literal("optional-claim")
const totalClaimKind = Schema.Literal("total-claim")

// RequireLookupOptionalClaimFact exists because its fields form one stable data contract used by the linter.
export const RequireLookupOptionalClaimFact = Schema.Struct({
  kind: optionalClaimKind,
  nameText: Schema.String,
  claimLabel: Schema.String
})

export interface RequireLookupOptionalClaimFact extends Schema.Schema.Type<
  typeof RequireLookupOptionalClaimFact
> {}

// RequireLookupTotalClaimFact exists because its fields form one stable data contract used by the linter.
export const RequireLookupTotalClaimFact = Schema.Struct({
  kind: totalClaimKind,
  nameText: Schema.String,
  claimLabel: Schema.String
})

export interface RequireLookupTotalClaimFact extends Schema.Schema.Type<
  typeof RequireLookupTotalClaimFact
> {}

const lookupTotalityFactMembers = Array.make(
  RequireLookupOptionalClaimFact,
  RequireLookupTotalClaimFact
)

// RequireLookupTotalityNameConsistencyFact unions claims because optional and total differ.
export const RequireLookupTotalityNameConsistencyFact = Schema.Union(lookupTotalityFactMembers)

export type RequireLookupTotalityNameConsistencyFact = Schema.Schema.Type<
  typeof RequireLookupTotalityNameConsistencyFact
>
