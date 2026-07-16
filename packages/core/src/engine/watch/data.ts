import { Data } from "effect"
import type * as ts from "typescript"
import type { ProgramContext } from "../sources/data.js"

// WorkspaceUpdate is one workspace batch because consumers need that contract.
export class WorkspaceUpdate extends Data.Class<{
  readonly rootPath: string
  readonly contexts: ReadonlyArray<ProgramContext>
}> {}

// SourceUpdate is the shared change/remove batch because update owners need one vocabulary.
export class SourceUpdate extends Data.Class<{
  readonly context: ProgramContext
  readonly changed: ReadonlyArray<ts.SourceFile>
  readonly removed: ReadonlyArray<string>
}> {}
