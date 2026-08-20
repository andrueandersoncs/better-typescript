import { Array, Schema } from "effect"

export const cardinalityValues = Array.make<["keyed", "many", "one", "optional-one", "unknown"]>(
  "keyed",
  "many",
  "one",
  "optional-one",
  "unknown"
)

// ResultCardinalityLiteral enumerates result cardinality because facts quote the observed class.
export const ResultCardinalityLiteral = Schema.Literals(cardinalityValues)
