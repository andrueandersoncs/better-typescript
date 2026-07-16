import { Data } from "effect"
import type { ProgramContext } from "../sources/data.js"

/**
 * One consistent workspace-wide batch: every project's latest ProgramContext in
 * project index order, emitted only after every project has arrived.
 *
 * @remarks
 *   Keeping contexts instead of materialized AST nodes lets the fused dispatcher
 *   traverse each source file once without retaining node wrappers. This model
 *   remains explicit because its consumers need the documented contract;
 *   removing it would reintroduce that contract at each use site.
 * @modelRole shared
 */
export class WorkspaceUpdate extends Data.Class<{
  readonly rootPath: string
  readonly contexts: ReadonlyArray<ProgramContext>
}> {}
