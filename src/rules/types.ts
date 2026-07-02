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

export class RuleMatch extends Schema.Class<RuleMatch>("RuleMatch")({
  ruleId: Schema.String,
  fileName: Schema.String,
  line: Schema.Int,
  column: Schema.Int,
  message: Schema.String,
  hint: Schema.String
}) {}

export type NodeHandler = (
  context: RuleContext
) => (node: ts.Node) => ReadonlyArray<RuleMatch>

export type FileHandler = (context: RuleContext) => ReadonlyArray<RuleMatch>

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

export type RuleCheck = (
  context: ProgramContext
) => ReadonlyArray<RuleListener>

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

export class Rule extends Schema.Class<Rule>("Rule")({
  id: Schema.String,
  description: Schema.String,
  example: RuleExample,
  check: ruleCheckSchema
}) {}
