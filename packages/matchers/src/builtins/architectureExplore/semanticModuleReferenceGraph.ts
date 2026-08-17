import { Data } from "effect"
import { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import type { SemanticReferenceWitness } from "./semanticReferenceWitness.js"
import type { semanticSubjectWitnessSchema as SemanticSubjectWitness } from "./semanticSubjectWitnessSchema.js"
import type { UnownedSemanticReferenceWitness } from "./unownedSemanticReferenceWitness.js"

// The graph bundles components, subjects, and references because hard-bond rules share one graph.
export class SemanticModuleReferenceGraph extends Data.Class<{
  readonly references: ReadonlyArray<SemanticReferenceWitness>
  readonly unownedConsumers: ReadonlyArray<UnownedSemanticReferenceWitness>
  readonly components: ReadonlyArray<ReadonlyArray<SemanticModuleEntityKey>>
  readonly subjects: ReadonlyArray<SemanticSubjectWitness>
}> {}
