import { Array, Schema } from "effect"

export const semanticReferenceKinds = Array.make<
  ["call", "value", "type", "construction", "inheritance", "decorator", "initializer"]
>("call", "value", "type", "construction", "inheritance", "decorator", "initializer")

// semanticReferenceKindSchema enumerates kinds because witnesses and graphs share one set.
export const semanticReferenceKindSchema = Schema.Literals(semanticReferenceKinds)
