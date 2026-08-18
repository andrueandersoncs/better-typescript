import { Data } from "effect"
import { ExportReferenceIndex } from "./exportReferenceIndex.js"
import { ExportSymbolIndex } from "./exportSymbolIndex.js"
import { ModuleEdge } from "./moduleEdge.js"

// Shared facts stay together because otherwise matchers rebuild the same Program work.
export class ArchitectureEvidence extends Data.Class<{
  readonly exportReferenceIndex: ExportReferenceIndex
  readonly exportSymbolIndex: ExportSymbolIndex
  readonly moduleEdges: ReadonlyArray<ModuleEdge>
}> {}
