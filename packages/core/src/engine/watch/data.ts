import { Data } from "effect"
import type { ProgramContext } from "../sources/data.js"

// WorkspaceUpdate is one workspace batch because consumers need that contract.
export class WorkspaceUpdate extends Data.Class<{
  readonly rootPath: string
  readonly contexts: ReadonlyArray<ProgramContext>
}> {}
