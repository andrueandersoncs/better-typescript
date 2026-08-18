import type * as ts from "typescript"

// ViolationCandidate crosses the public constructor because syntax context precedes serialization.
export interface ViolationCandidate {
  readonly ruleName: string
  readonly message: string
  readonly workspaceRoot: string
  readonly sourceFile: ts.SourceFile
  readonly node: ts.Node
}
