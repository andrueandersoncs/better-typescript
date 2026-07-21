import { Array, Data, HashMap, HashSet, Option, Schema } from "effect"
import type * as ts from "typescript"
import type { ReferenceKey } from "../../support/referenceKey.js"
import type { FunctionDefinition } from "../../support/tsNode.js"

// DataStructureDeclaration is the first-party model syntax union because ownership is shared.
export type DataStructureDeclaration =
  | ts.ClassDeclaration
  | ts.EnumDeclaration
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.VariableDeclaration

const modelRoles = Array.make<["shared", "boundary", "invariant", "protocol", "recursive"]>(
  "shared",
  "boundary",
  "invariant",
  "protocol",
  "recursive"
)

const modelRoleSchema = Schema.Literals(modelRoles)

// ModelRole is the shared role vocabulary because ConceptIndex and lists agree.
export type ModelRole = typeof modelRoleSchema.Type

const conceptSignalKinds = Array.make<
  [
    "closed-abstraction",
    "duplicate-shape",
    "function-derived-model",
    "missing-rationale",
    "parameter-bag",
    "pass-through-conversion",
    "redundant-alias",
    "speculative-export",
    "unused-field"
  ]
>(
  "closed-abstraction",
  "duplicate-shape",
  "function-derived-model",
  "missing-rationale",
  "parameter-bag",
  "pass-through-conversion",
  "redundant-alias",
  "speculative-export",
  "unused-field"
)

const conceptSignalKindSchema = Schema.Literals(conceptSignalKinds)

// ConceptSignalKind is the shared signal vocabulary because kind lists agree.
export type ConceptSignalKind = typeof conceptSignalKindSchema.Type

// DataStructureEntry is one named model plus syntax because concept matchers share identity.
export class DataStructureEntry extends Data.Class<{
  readonly symbol: ts.Symbol
  readonly declaration: DataStructureDeclaration
  readonly documentationNode: ts.Node
  readonly nameNode: ts.Identifier
  readonly name: string
  readonly sourceFile: ts.SourceFile
  readonly exported: boolean
  readonly shape: Option.Option<string>
  readonly fieldSymbols: ReadonlyArray<ts.Symbol>
}> {}

// FunctionEntry is one named executable abstraction because ownership and leverage share identity.
export class FunctionEntry extends Data.Class<{
  readonly symbol: ts.Symbol
  readonly definition: Option.Option<FunctionDefinition>
  readonly nameNode: ts.Identifier
  readonly name: string
  readonly sourceFile: ts.SourceFile
  readonly exported: boolean
}> {}

// FieldRead attributes a field access to its owner because construction is not consumption.
export class FieldRead extends Data.Class<{
  readonly model: DataStructureEntry
  readonly field: ReferenceKey<ts.Symbol>
  readonly owner: Option.Option<ts.Symbol>
  readonly node: ts.Node
}> {}

// PassThroughConversion is conversion evidence because parallel models are ok.
export class PassThroughConversion extends Data.Class<{
  readonly source: DataStructureEntry
  readonly target: DataStructureEntry
  readonly functionEntry: FunctionEntry
  readonly node: ts.Node
}> {}

// ParameterBag is a model built only to cross one call seam because raw counts are ambiguous.
export class ParameterBag extends Data.Class<{
  readonly model: DataStructureEntry
  readonly functionEntry: FunctionEntry
  readonly node: ts.Node
}> {}

// ConceptIndex is the shared program snapshot because detections reuse one map.
export class ConceptIndex extends Data.Class<{
  readonly projectRoot: string
  readonly dataStructures: ReadonlyArray<DataStructureEntry>
  readonly functions: ReadonlyArray<FunctionEntry>
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

const stringArraySchema = Schema.Array(Schema.String)

// ConceptSignalData is machine-readable concept evidence because reports avoid prose.
export const ConceptSignalData = Schema.Struct({
  kind: conceptSignalKindSchema,
  concept: Schema.String,
  owner: Schema.String,
  independentOwners: Schema.Number,
  externalCallers: Schema.Number,
  relatedConcepts: stringArraySchema
})

export interface ConceptSignalData extends Schema.Schema.Type<typeof ConceptSignalData> {}
