import { Data, HashMap } from "effect"
import type { ReferenceKey } from "../../support/referenceKeyType.js"
import { ExportedFunctionEntry } from "./exportedFunctionEntry.js"
import { ExportUsage } from "./exportUsage.js"

// ExportReferenceIndex joins entries to usage by symbol because matchers need one inventory.
export class ExportReferenceIndex extends Data.Class<{
  readonly entries: ReadonlyArray<ExportedFunctionEntry>
  readonly usages: HashMap.HashMap<ReferenceKey<import("typescript").Symbol>, ExportUsage>
}> {}
