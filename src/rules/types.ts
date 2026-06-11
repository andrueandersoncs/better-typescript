import { Predicate, Schema } from "effect"
import * as ts from "typescript"
import { TsProgram, TsSourceFile, TsTypeChecker } from "./tsSchema.js"

// Every record in the rule algebra is a Schema class rather than an interface, so
// values are built through validating constructors instead of raw object literals —
// the same discipline prefer-effect-schema-constructor and prefer-effect-schema-class
// ask of target projects.
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

export type NodeHandler = (node: ts.Node, context: RuleContext) => ReadonlyArray<RuleMatch>

export type FileHandler = (context: RuleContext) => ReadonlyArray<RuleMatch>

const isNodeHandler = (input: unknown): input is NodeHandler => Predicate.isFunction(input)

const isFileHandler = (input: unknown): input is FileHandler => Predicate.isFunction(input)

const NodeHandlerSchema = Schema.declare(isNodeHandler).annotations({
  identifier: "NodeHandler"
})

const FileHandlerSchema = Schema.declare(isFileHandler).annotations({
  identifier: "FileHandler"
})

const syntaxKindSchema = Schema.Enums(ts.SyntaxKind)
const listenerKindsSchema = Schema.Array(syntaxKindSchema)

// A RuleCheck is data, not a traversal: a free monoid of listeners describing which
// nodes a rule wants to see. An interpreter (runner/compileRules.ts) folds every
// rule's listeners into one kind-dispatch table and walks each source file once,
// so adding rules does not add traversals.
export class NodeListener extends Schema.TaggedClass<NodeListener>()("OnNode", {
  kinds: listenerKindsSchema,
  handler: NodeHandlerSchema
}) {}

export class FileListener extends Schema.TaggedClass<FileListener>()("OnFile", {
  handler: FileHandlerSchema
}) {}

export type RuleListener = NodeListener | FileListener

export type RuleCheck = ReadonlyArray<RuleListener>

const ruleListenerSchema = Schema.Union(NodeListener, FileListener)
const ruleCheckSchema = Schema.Array(ruleListenerSchema)

export class Rule extends Schema.Class<Rule>("Rule")({
  id: Schema.String,
  description: Schema.String,
  check: ruleCheckSchema
}) {}
