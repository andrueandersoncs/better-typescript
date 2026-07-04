import { Predicate, Schema } from "effect"
import * as ts from "typescript"
import { TsProgram, TsSourceFile, TsTypeChecker } from "./tsSchema.js"

export class ProgramContext extends Schema.Class<ProgramContext>(
  "ProgramContext"
)({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String
}) {}

export class RuleContext extends Schema.Class<RuleContext>("RuleContext")({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String,
  sourceFile: TsSourceFile
}) {}

const emptyFacets = (): ReadonlyArray<string> => []

const facetListSchema = Schema.Array(Schema.String)

const facetsSchema = Schema.optionalWith(facetListSchema, {
  default: emptyFacets
})

// Evidence is the evaluation trace: the measurements a detector took while deciding to fire.
export class EvidenceItem extends Schema.Class<EvidenceItem>("EvidenceItem")({
  measure: Schema.String,
  count: Schema.Int
}) {}

export type Evidence = ReadonlyArray<EvidenceItem>

const evidenceListSchema = Schema.Array(EvidenceItem)

const emptyEvidence = (): Evidence => []

const evidenceSchema = Schema.optionalWith(evidenceListSchema, {
  default: emptyEvidence
})

export type DetectorLevel = "node" | "file" | "directory" | "project"

const nodeLevel = (): DetectorLevel => "node"

const levelLiteralSchema = Schema.Literal(
  "node",
  "file",
  "directory",
  "project"
)

const levelSchema = Schema.optionalWith(levelLiteralSchema, {
  default: nodeLevel
})

const zeroPosition = (): number => 0

// line/column are 1-indexed at node level; 0 marks findings above node level, which have no source position.
const positionSchema = Schema.optionalWith(Schema.Int, {
  default: zeroPosition
})

// The one output of every detector at every level (see adrs/0003-detectors-over-a-stratified-containment-tree.md): a rule match is a node-level finding, advice is a file/directory/project-level finding. message/hint are reporter payload stamped at emission — presentation, never identity and never visible to the matcher language.
export class Finding extends Schema.Class<Finding>("Finding")({
  detectorId: Schema.String,
  level: levelSchema,
  path: Schema.String,
  line: positionSchema,
  column: positionSchema,
  message: Schema.String,
  hint: Schema.String,
  evidence: evidenceSchema,
  facets: facetsSchema
}) {}

export type NodeHandler = (
  context: RuleContext
) => (node: ts.Node) => ReadonlyArray<Finding>

export type FileHandler = (context: RuleContext) => ReadonlyArray<Finding>

const isNodeHandler = (input: unknown): input is NodeHandler =>
  Predicate.isFunction(input)

const isFileHandler = (input: unknown): input is FileHandler =>
  Predicate.isFunction(input)

const NodeHandlerSchema = Schema.declare(isNodeHandler).annotations({
  identifier: "NodeHandler"
})

const FileHandlerSchema = Schema.declare(isFileHandler).annotations({
  identifier: "FileHandler"
})

const syntaxKindSchema = Schema.Enums(ts.SyntaxKind)
const listenerKindsSchema = Schema.Array(syntaxKindSchema)

export class NodeListener extends Schema.TaggedClass<NodeListener>()("OnNode", {
  kinds: listenerKindsSchema,
  handler: NodeHandlerSchema
}) {}

export class FileListener extends Schema.TaggedClass<FileListener>()("OnFile", {
  handler: FileHandlerSchema
}) {}

export type RuleListener = NodeListener | FileListener

export type RuleCheck = (context: ProgramContext) => ReadonlyArray<RuleListener>

const isRuleCheck = (input: unknown): input is RuleCheck =>
  Predicate.isFunction(input)

const ruleCheckSchema = Schema.declare(isRuleCheck).annotations({
  identifier: "RuleCheck"
})

export class ExampleSnippet extends Schema.Class<ExampleSnippet>(
  "ExampleSnippet"
)({
  filePath: Schema.String,
  code: Schema.String
}) {}

const exampleSnippetArraySchema = Schema.Array(ExampleSnippet)

const emptyContextSnippets = (): ReadonlyArray<ExampleSnippet> => []

const contextSnippetsSchema = Schema.optionalWith(exampleSnippetArraySchema, {
  default: emptyContextSnippets
})

export class RuleExample extends Schema.Class<RuleExample>("RuleExample")({
  bad: exampleSnippetArraySchema,
  good: exampleSnippetArraySchema,
  context: contextSnippetsSchema
}) {}

export type RuleRole = "finding" | "signal"

// The full role axis across detector species: node rules carry finding | signal, summary detectors carry advice. Gating is role finding only (see adrs/0003-detectors-over-a-stratified-containment-tree.md).
export type DetectorRole = RuleRole | "advice"

const findingRole = (): RuleRole => "finding"

// Findings gate the exit code and appear in the style guide; signals only feed the match interpreter (see adrs/0001-layered-match-interpretation.md).
const roleLiteralSchema = Schema.Literal("finding", "signal")

export const roleSchema = Schema.optionalWith(roleLiteralSchema, {
  default: findingRole
})

export class Rule extends Schema.Class<Rule>("Rule")({
  id: Schema.String,
  description: Schema.String,
  example: RuleExample,
  check: ruleCheckSchema,
  role: roleSchema
}) {}

export const isFindingRule = (rule: Rule): boolean => rule.role === "finding"
