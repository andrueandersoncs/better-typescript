import { Array, Schema } from "effect"

const nonBooleanPredicateKind = Schema.Literal("non-boolean-predicate")
const booleanIncompatibleKind = Schema.Literal("boolean-incompatible")

// RequirePredicateNonBooleanFact is non-boolean predicate evidence because name and shape pair.
export const RequirePredicateNonBooleanFact = Schema.Struct({
  kind: nonBooleanPredicateKind,
  nameText: Schema.String,
  shape: Schema.String
})

export interface RequirePredicateNonBooleanFact extends Schema.Schema.Type<
  typeof RequirePredicateNonBooleanFact
> {}

// RequirePredicateBooleanIncompatibleFact is incompatible evidence because verbs must match.
export const RequirePredicateBooleanIncompatibleFact = Schema.Struct({
  kind: booleanIncompatibleKind,
  nameText: Schema.String,
  operation: Schema.String
})

export interface RequirePredicateBooleanIncompatibleFact extends Schema.Schema.Type<
  typeof RequirePredicateBooleanIncompatibleFact
> {}

const predicateFactMembers = Array.make(
  RequirePredicateNonBooleanFact,
  RequirePredicateBooleanIncompatibleFact
)

// RequirePredicateNameConsistencyFact unions claims because non-boolean and incompatible differ.
export const RequirePredicateNameConsistencyFact = Schema.Union(predicateFactMembers)

export type RequirePredicateNameConsistencyFact = Schema.Schema.Type<
  typeof RequirePredicateNameConsistencyFact
>
