import { Data } from "effect"
import type { SemanticReferenceWitness } from "./semanticReferenceWitness.js"

// IndexedReference joins graph evidence to component positions because grouping needs both facts.
export class IndexedReference extends Data.Class<{
  readonly consumerIndex: number
  readonly reference: SemanticReferenceWitness
  readonly targetIndex: number
}> {}
