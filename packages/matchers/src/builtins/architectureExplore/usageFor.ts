import { Struct, flow } from "effect"
import type { ExportReferenceIndex } from "./exportReferenceIndex.js"
import type { ExportedFunctionEntry } from "./exportedFunctionEntry.js"
import { usageForSymbol } from "./usageForSymbol.js"

export const usageFor = (index: ExportReferenceIndex) =>
  flow(Struct.get<ExportedFunctionEntry, "symbol">("symbol"), usageForSymbol(index.usages))
