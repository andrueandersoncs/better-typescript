import { Data } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import type { SemanticReferenceWitness } from "./semanticReferenceWitness.js"
import type { UnownedSemanticReferenceWitness } from "./unownedSemanticReferenceWitness.js"

// SemanticModuleReferenceGraph bundles components and because hard-bond rules share one graph.
export class SemanticModuleReferenceGraph extends Data.Class<{
  readonly nodes: ReadonlyArray<SemanticModuleEntityKey>
  readonly references: ReadonlyArray<SemanticReferenceWitness>
  readonly unownedConsumers: ReadonlyArray<UnownedSemanticReferenceWitness>
  readonly components: ReadonlyArray<ReadonlyArray<SemanticModuleEntityKey>>
}> {}
