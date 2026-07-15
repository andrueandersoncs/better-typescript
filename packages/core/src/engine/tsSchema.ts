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
 * TsSourceFile is the shared typeParameters, Type, Encoded, Context contract
 * used by CheckContext and AstNodeElement.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export const TsSourceFile = Schema.declare(isTsSourceFile, {
  identifier: "ts.SourceFile"
})

const isTsNode = (input: unknown): input is ts.Node => Predicate.hasProperty(input, "kind")

/**
 * TsNode is the shared typeParameters, Type, Encoded, Context contract used by
 * AstNodeElement and DetectionSource.
 *
 * @remarks
 *   It remains explicit because these independent owners need one stable
 *   vocabulary. Removing it would duplicate the field contract across consumers
 *   and let their representations drift.
 * @modelRole shared
 */
export const TsNode = Schema.declare(isTsNode, {
  identifier: "ts.Node"
})
