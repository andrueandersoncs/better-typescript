import type * as ts from "typescript"
import type { RuleName } from "./ruleName.js"

// ViolationCandidate crosses the public constructor because syntax context precedes serialization.
export interface ViolationCandidate {
  readonly ruleName: RuleName
  readonly message: string
  readonly workspaceRoot: string
  readonly sourceFile: ts.SourceFile
  readonly node: ts.Node
}
