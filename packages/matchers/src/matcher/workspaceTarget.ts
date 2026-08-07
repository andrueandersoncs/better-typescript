import type * as ts from "typescript"
import { Data } from "effect"
import type { DirectoryTarget } from "./directoryTarget.js"
import type { FileTarget } from "./fileTarget.js"
import type { NodeTarget } from "./nodeTarget.js"
import type { PositionTarget } from "./positionTarget.js"

// WorkspaceTarget covers the whole workspace root because some policies are repo-global.
export class WorkspaceTarget extends Data.TaggedClass("WorkspaceTarget")<{
  readonly workspaceRoot: string
  readonly sourceFiles: ReadonlyArray<ts.SourceFile>
}> {}

// Target is the shared location union because Match must carry one address vocabulary.
export type Target = NodeTarget | FileTarget | PositionTarget | DirectoryTarget | WorkspaceTarget
