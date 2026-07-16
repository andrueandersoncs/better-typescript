import { Predicate, Schema } from "effect"
import type * as ts from "typescript"

const isTsProgram = (input: unknown): input is ts.Program =>
  Predicate.hasProperty(input, "getTypeChecker")

const isTsTypeChecker = (input: unknown): input is ts.TypeChecker =>
  Predicate.hasProperty(input, "getTypeAtLocation")

const isTsSourceFile = (input: unknown): input is ts.SourceFile =>
  Predicate.hasProperty(input, "languageVersion")

/**
 * TsProgram is the shared typeParameters, Type, Encoded, Context contract used
 * by CheckContext, LoadedProject, and ProgramContext.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export const TsProgram = Schema.declare(isTsProgram, {
  identifier: "ts.Program"
})

/**
 * TsTypeChecker is the shared typeParameters, Type, Encoded, Context contract
 * used by CheckContext and ProgramContext.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export const TsTypeChecker = Schema.declare(isTsTypeChecker, {
  identifier: "ts.TypeChecker"
})

/**
 * TsSourceFile is the runtime-schema boundary that admits external TypeScript
 * source-file objects into CheckContext.
 *
 * @remarks
 *   It remains distinct because core must validate compiler-owned objects without
 *   claiming or copying their structure. Removing it would either inline that
 *   external-object validation into CheckContext or weaken the field to
 *   unknown.
 * @modelRole boundary
 */
export const TsSourceFile = Schema.declare(isTsSourceFile, {
  identifier: "ts.SourceFile"
})

const isTsNode = (input: unknown): input is ts.Node => Predicate.hasProperty(input, "kind")

/**
 * TsNode is the runtime-schema boundary that admits external TypeScript nodes
 * into DetectionSource.
 *
 * @remarks
 *   It remains distinct because checks pass compiler-owned nodes across the
 *   pre-location detection seam without copying their structure. Removing it
 *   would either inline that validation into DetectionSource or weaken the node
 *   field to unknown.
 * @modelRole boundary
 */
export const TsNode = Schema.declare(isTsNode, {
  identifier: "ts.Node"
})
