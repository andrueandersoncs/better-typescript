import { Data } from "effect"
import type { ProgramContext } from "../sources/data.js"

// WorkspaceUpdate is one complete workspace snapshot because each report run owns that contract.
export class WorkspaceUpdate extends Data.Class<{
  readonly rootPath: string
  readonly contexts: ReadonlyArray<ProgramContext>
}> {}
