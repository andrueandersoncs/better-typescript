import { Data } from "effect"
import type { IndexedReference } from "./indexedReference.js"
import type { SemanticModuleEntityKey } from "./semanticModuleEntityKey.js"
import type { SemanticModuleReferenceGraph } from "./semanticModuleReferenceGraph.js"

// OwnershipIndex stores each graph-wide lookup once because candidates share the same evidence.
export class OwnershipIndex extends Data.Class<{
  readonly incomingByTarget: Readonly<Record<string, ReadonlyArray<IndexedReference>>>
  readonly unownedByTarget: Readonly<
    Record<string, SemanticModuleReferenceGraph["unownedConsumers"]>
  >
  readonly subjectsByComponent: ReadonlyArray<ReadonlyArray<SemanticModuleEntityKey>>
}> {}
