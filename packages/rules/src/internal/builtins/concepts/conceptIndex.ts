import { Data, HashMap, HashSet } from "effect"
import type * as ts from "typescript"
import type { ReferenceKey } from "../../support/referenceKeyType.js"
import type { DataStructureEntry } from "./conceptScanners.js"
import type { FieldRead } from "./fieldRead.js"
import type { FunctionEntry } from "./functionEntry.js"
import type { ModelRole } from "./modelRole.js"
import type { ParameterBag } from "./parameterBag.js"
import type { PassThroughConversion } from "./passThroughConversion.js"

// ConceptIndex is the shared program snapshot because recognizers reuse one map.
export class ConceptIndex extends Data.Class<{
  readonly dataStructures: ReadonlyArray<DataStructureEntry>
  readonly dataBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, DataStructureEntry>
  readonly functionBySymbol: HashMap.HashMap<ReferenceKey<ts.Symbol>, FunctionEntry>
  readonly ownersByData: HashMap.HashMap<
    ReferenceKey<ts.Symbol>,
    HashSet.HashSet<ReferenceKey<ts.Symbol>>
  >
  readonly ownersByFunction: HashMap.HashMap<
    ReferenceKey<ts.Symbol>,
    HashSet.HashSet<ReferenceKey<ts.Symbol>>
  >
  readonly rolesByData: HashMap.HashMap<ReferenceKey<ts.Symbol>, HashSet.HashSet<ModelRole>>
  readonly fieldReads: ReadonlyArray<FieldRead>
  readonly readFieldNames: HashSet.HashSet<string>
  readonly shapeGroups: HashMap.HashMap<string, ReadonlyArray<DataStructureEntry>>
  readonly passThroughConversions: ReadonlyArray<PassThroughConversion>
  readonly parameterBags: ReadonlyArray<ParameterBag>
}> {}
