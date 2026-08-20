import { Array, Schema } from "effect"

const factoryMasqueradeKind = Schema.Literal("factory-masquerade")
const unnamedConstructionKind = Schema.Literal("unnamed-construction")

// RequireConstructionFactoryMasqueradeFact exists because its fields form one stable data contract used by the linter.
export const RequireConstructionFactoryMasqueradeFact = Schema.Struct({
  kind: factoryMasqueradeKind,
  nameText: Schema.String,
  operation: Schema.String
})

export interface RequireConstructionFactoryMasqueradeFact extends Schema.Schema.Type<
  typeof RequireConstructionFactoryMasqueradeFact
> {}

// RequireConstructionUnnamedConstructionFact exists because its fields form one stable data contract used by the linter.
export const RequireConstructionUnnamedConstructionFact = Schema.Struct({
  kind: unnamedConstructionKind,
  nameText: Schema.String
})

export interface RequireConstructionUnnamedConstructionFact extends Schema.Schema.Type<
  typeof RequireConstructionUnnamedConstructionFact
> {}

const constructionFactMembers = Array.make(
  RequireConstructionFactoryMasqueradeFact,
  RequireConstructionUnnamedConstructionFact
)

// RequireConstructionNameConsistencyFact unions claims because masquerade and unnamed differ.
export const RequireConstructionNameConsistencyFact = Schema.Union(constructionFactMembers)

export type RequireConstructionNameConsistencyFact = Schema.Schema.Type<
  typeof RequireConstructionNameConsistencyFact
>
