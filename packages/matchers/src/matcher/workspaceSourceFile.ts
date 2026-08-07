import type * as ts from "typescript"
import { Data } from "effect"

// WorkspaceSourceFile pairs path and SourceFile because workspace policies key by path.
export class WorkspaceSourceFile extends Data.Class<{
  readonly path: string
  readonly sourceFile: ts.SourceFile
}> {}
