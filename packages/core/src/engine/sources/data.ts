import { Data, MutableList, Schema } from "effect"
import type * as ts from "typescript"
import type { NodeSubscription, Subscription } from "../check/data.js"
import type { Detection } from "../location/data.js"
import { TsProgram, TsTypeChecker } from "../tsSchema.js"

/**
 * ProgramContext is the shared program, checker, projectRoot contract used by
 * runChecks, Check, and workspaceSignals.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class ProgramContext extends Schema.Class<ProgramContext>("ProgramContext")({
  program: TsProgram,
  checker: TsTypeChecker,
  projectRoot: Schema.String
}) {}

/**
 * SourceUpdate is the shared context, changed, removed contract used by
 * diffCheckableFiles, workspaceUpdates, and sourceUpdates.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export class SourceUpdate extends Data.Class<{
  readonly context: ProgramContext
  readonly changed: ReadonlyArray<ts.SourceFile>
  readonly removed: ReadonlyArray<string>
}> {}

/**
 * CachedPlan is the program-identity cache entry used by withProgramIndex fused
 * dispatch.
 *
 * @remarks
 *   It remains explicit because plan reuse must compare program identity and the
 *   compiled subscriptions together. Removing it would force withProgramIndex
 *   to rebuild subscriptions on every context or keep those values in parallel
 *   caches that can drift.
 * @modelRole shared
 */
export class CachedPlan extends Data.Class<{
  readonly program: ts.Program
  readonly subscriptions: ReadonlyArray<Subscription>
}> {}

/**
 * PlannedNodeSubscription is the planned OnNode row used by runChecks fused
 * dispatch.
 *
 * @remarks
 *   It remains explicit because fused node dispatch needs the owning check index
 *   beside each OnNode subscription before handlers activate per file. Removing
 *   it would make runChecks rebuild that pairing with parallel arrays that can
 *   drift.
 * @modelRole shared
 */
export class PlannedNodeSubscription extends Data.Class<{
  readonly checkIndex: number
  readonly subscription: NodeSubscription
}> {}

/**
 * ActiveNodeSubscription is the live OnNode handler plus mutable detection
 * accumulator used by runChecks fused dispatch.
 *
 * @remarks
 *   It remains explicit because one source-file pass must keep the bound handler,
 *   owning check index, and mutable detections together while walking the AST.
 *   Removing it would split those correlated values across parallel structures
 *   that can drift mid-dispatch.
 * @modelRole shared
 */
export class ActiveNodeSubscription extends Data.Class<{
  readonly checkIndex: number
  readonly handle: (node: ts.Node) => ReadonlyArray<Detection>
  readonly detections: MutableList.MutableList<Detection>
}> {}
