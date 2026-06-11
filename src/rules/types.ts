import { Schema } from "effect"
import type * as ts from "typescript"
import { TsProgram, TsSourceFile, TsTypeChecker } from "./tsSchema.js"

export interface Rule {
  readonly id: string
  readonly description: string
  readonly check: RuleCheck
}

// RuleContext and RuleMatch are Schema classes rather than plain interfaces so they
// are built through validating constructors instead of raw object literals — the
// same discipline prefer-effect-schema-constructor asks of target projects.
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

// A RuleCheck is data, not a traversal: a free monoid of listeners describing which
// nodes a rule wants to see. An interpreter (runner/compileRules.ts) folds every
// rule's listeners into one kind-dispatch table and walks each source file once,
// so adding rules does not add traversals.
export type RuleCheck = ReadonlyArray<RuleListener>

export type RuleListener = NodeListener | FileListener

export interface NodeListener {
  readonly _tag: "OnNode"
  readonly kinds: ReadonlyArray<ts.SyntaxKind>
  readonly handler: (node: ts.Node, context: RuleContext) => ReadonlyArray<RuleMatch>
}

export interface FileListener {
  readonly _tag: "OnFile"
  readonly handler: (context: RuleContext) => ReadonlyArray<RuleMatch>
}
