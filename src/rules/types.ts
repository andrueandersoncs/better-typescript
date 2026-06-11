import type * as ts from "typescript"

export interface Rule {
  readonly id: string
  readonly description: string
  readonly check: RuleCheck
}

export interface RuleContext {
  readonly program: ts.Program
  readonly checker: ts.TypeChecker
  readonly projectRoot: string
  readonly sourceFile: ts.SourceFile
}

export interface RuleMatch {
  readonly ruleId: string
  readonly fileName: string
  readonly line: number
  readonly column: number
  readonly message: string
  readonly hint: string
}

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
