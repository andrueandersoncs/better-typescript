import { Data, HashMap, HashSet, Option, Schema } from "effect"
import type * as ts from "typescript"

/**
 * The declaration forms that introduce a first-party data concept.
 *
 * @modelRole protocol
 * @remarks This union exists because concept analysis must apply one ownership
 * and rationale policy across TypeScript and Effect model syntax. Removing it
 * would duplicate declaration classification throughout every concept check.
 */
export type DataStructureDeclaration =
  | ts.ClassDeclaration
  | ts.EnumDeclaration
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.VariableDeclaration

/**
 * The named declaration forms that can own an executable abstraction.
 *
 * @modelRole protocol
 * @remarks This union exists because call and model-use edges must resolve to
 * one stable owner regardless of function declaration syntax. Removing it
 * would make every graph consumer repeat arrow, method, and function ownership logic.
 */
export type FunctionDefinition =
  | ts.ArrowFunction
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.MethodDeclaration

const modelRoleSchema = Schema.Literal(
  "shared",
  "boundary",
  "invariant",
  "protocol",
  "recursive"
)

/**
 * ModelRole is the shared length contract used by ConceptIndex, validModelRoles, and
 * structuralRoles.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export type ModelRole = typeof modelRoleSchema.Type

const conceptSignalKindSchema = Schema.Literal(
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

/**
 * ConceptSignalKind is the shared length contract used by proliferationKinds and
 * conceptControlSubscriptions.
 *
 * @modelRole shared
 * @remarks It remains explicit because these independent owners need one stable
 * vocabulary. Removing it would duplicate the field contract across consumers and let
 * their representations drift.
 */
export type ConceptSignalKind = typeof conceptSignalKindSchema.Type

/**
 * One named first-party data concept and the syntax that defines it.
 *
 * @modelRole shared
 * @remarks The record exists because rationale, reuse, ownership, and depth
 * checks need identical symbol identity and declaration classification.
 * Removing it would let those checks disagree about what one model represents.
 */
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

/**
 * One named executable abstraction in the concept graph.
 *
 * @modelRole shared
 * @remarks The record exists because model ownership and call leverage must use
 * the same function identity. Removing it would reduce cluster analysis to
 * unreliable name matching across declaration forms.
 */
export class FunctionEntry extends Data.Class<{
  readonly symbol: ts.Symbol
  readonly definition: Option.Option<FunctionDefinition>
  readonly nameNode: ts.Identifier
  readonly name: string
  readonly sourceFile: ts.SourceFile
  readonly exported: boolean
}> {}

/**
 * A field read attributed to the independent declaration that performs it.
 *
 * @modelRole shared
 * @remarks This record exists because construction and forwarding do not prove
 * that a field is semantically consumed. Removing the owner distinction would
 * let repeated mechanical writes hide speculative fields.
 */
export class FieldRead extends Data.Class<{
  readonly model: DataStructureEntry
  readonly field: ts.Symbol
  readonly owner: Option.Option<ts.Symbol>
  readonly node: ts.Node
}> {}

/**
 * A field-for-field conversion between two named first-party representations.
 *
 * @modelRole boundary
 * @remarks This record exists because parallel boundary representations can be
 * legitimate while still requiring review. Removing it would collapse useful
 * evidence into an unqualified duplicate-shape warning.
 */
export class PassThroughConversion extends Data.Class<{
  readonly source: DataStructureEntry
  readonly target: DataStructureEntry
  readonly functionEntry: FunctionEntry
  readonly node: ts.Node
}> {}

/**
 * A named model constructed solely to cross one function call seam.
 *
 * @modelRole shared
 * @remarks This record exists because raw construction counts cannot distinguish
 * reusable domain values from immediate parameter bags. Removing the call edge
 * would make procedural abstractions appear to have independent model owners.
 */
export class ParameterBag extends Data.Class<{
  readonly model: DataStructureEntry
  readonly functionEntry: FunctionEntry
  readonly node: ts.Node
}> {}

/**
 * The immutable program snapshot consumed by all concept-control detections.
 *
 * @modelRole shared
 * @remarks The index exists because building separate ownership and shape maps
 * for every rule would repeat whole-program traversal and exceed the benchmark
 * budget. Removing it would also let rule-specific classifiers drift apart.
 */
export class ConceptIndex extends Data.Class<{
  readonly projectRoot: string
  readonly dataStructures: ReadonlyArray<DataStructureEntry>
  readonly functions: ReadonlyArray<FunctionEntry>
  readonly dataBySymbol: HashMap.HashMap<ts.Symbol, DataStructureEntry>
  readonly functionBySymbol: HashMap.HashMap<ts.Symbol, FunctionEntry>
  readonly ownersByData: HashMap.HashMap<ts.Symbol, HashSet.HashSet<ts.Symbol>>
  readonly ownersByFunction: HashMap.HashMap<
    ts.Symbol,
    HashSet.HashSet<ts.Symbol>
  >
  readonly rolesByData: HashMap.HashMap<ts.Symbol, HashSet.HashSet<ModelRole>>
  readonly fieldReads: ReadonlyArray<FieldRead>
  readonly readFieldNames: HashSet.HashSet<string>
  readonly shapeGroups: HashMap.HashMap<
    string,
    ReadonlyArray<DataStructureEntry>
  >
  readonly passThroughConversions: ReadonlyArray<PassThroughConversion>
  readonly parameterBags: ReadonlyArray<ParameterBag>
}> {}

/**
 * Machine-readable evidence attached to a concept-control diagnostic.
 *
 * @modelRole shared
 * @remarks This schema exists because NDJSON consumers and architecture advice
 * must correlate local findings without parsing human messages. Removing it
 * would duplicate unstable text parsing in every downstream report.
 */
export class ConceptSignalData extends Schema.Class<ConceptSignalData>(
  "ConceptSignalData"
)({
  kind: conceptSignalKindSchema,
  concept: Schema.String,
  owner: Schema.String,
  independentOwners: Schema.Number,
  externalCallers: Schema.Number,
  relatedConcepts: Schema.Array(Schema.String)
}) {}
