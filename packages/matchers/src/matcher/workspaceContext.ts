import { WorkspaceSourceFile } from "./workspaceSourceFile.js"
import { Data } from "effect"

// WorkspaceContext holds path-normalized files because workspace matchers need them first.
export class WorkspaceContext extends Data.Class<{
  readonly workspaceRoot: string
  readonly sourceFiles: ReadonlyArray<WorkspaceSourceFile>
}> {}
