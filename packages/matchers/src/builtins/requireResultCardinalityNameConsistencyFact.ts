import { Array, Schema } from "effect"
import { ResultCardinalityLiteral } from "./resultCardinalityLiteral.js"

const pluralForOneKind = Schema.Literal("plural-for-one")
const singularForManyKind = Schema.Literal("singular-for-many")

// RequireResultCardinalityPluralForOneFact is plural-for-one evidence because nouns must match.
export const RequireResultCardinalityPluralForOneFact = Schema.Struct({
  kind: pluralForOneKind,
  nameText: Schema.String,
  claimed: Schema.String,
  singular: Schema.String,
  cardinality: ResultCardinalityLiteral
})

export interface RequireResultCardinalityPluralForOneFact extends Schema.Schema.Type<
  typeof RequireResultCardinalityPluralForOneFact
> {}

// RequireResultCardinalitySingularForManyFact is singular-for-many evidence because nouns match.
export const RequireResultCardinalitySingularForManyFact = Schema.Struct({
  kind: singularForManyKind,
  nameText: Schema.String,
  claimed: Schema.String,
  plural: Schema.String,
  cardinality: ResultCardinalityLiteral
})

export interface RequireResultCardinalitySingularForManyFact extends Schema.Schema.Type<
  typeof RequireResultCardinalitySingularForManyFact
> {}

const cardinalityFactMembers = Array.make(
  RequireResultCardinalityPluralForOneFact,
  RequireResultCardinalitySingularForManyFact
)

// RequireResultCardinalityNameConsistencyFact unions claims because plural and singular differ.
export const RequireResultCardinalityNameConsistencyFact = Schema.Union(cardinalityFactMembers)

export type RequireResultCardinalityNameConsistencyFact = Schema.Schema.Type<
  typeof RequireResultCardinalityNameConsistencyFact
>
