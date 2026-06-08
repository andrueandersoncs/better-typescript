import type * as ts from "typescript"

export interface Rule {
  readonly id: string
  readonly description: string
  readonly check: (context: RuleContext) => ReadonlyArray<RuleMatch>
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
