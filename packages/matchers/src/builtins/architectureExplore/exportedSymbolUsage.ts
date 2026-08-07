import { Array, Schema } from "effect"

const exportedSymbolKinds = Array.make<["function", "class", "type", "value"]>(
  "function",
  "class",
  "type",
  "value"
)

const exportedSymbolKind = Schema.Literals(exportedSymbolKinds)

// ExportedSymbolUsage summarizes external references because deletion tests exclude the home file.
export const ExportedSymbolUsage = Schema.Struct({
  name: Schema.String,
  kind: exportedSymbolKind,
  referencingFileCount: Schema.Number,
  referencingTestFileCount: Schema.Number,
  callCount: Schema.Number
})

export interface ExportedSymbolUsage extends Schema.Schema.Type<typeof ExportedSymbolUsage> {}
