import { Array, Option, Predicate, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import type { MatchContext } from "@better-typescript/matchers/matcher/data"
import { propertyAssignmentNamed } from "../functionalCoreEffect/propertyAssignments.js"
import { callExpressionOf, unwrapTransparentExpression } from "../../support/tsNode.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import { roleForSourceFile, type EffectQualityIndex } from "./index.js"
import { isTestRole } from "./architectureRoles.js"
import { makeRuleFinding } from "./makeFindings.js"
import {
  callArgumentAt,
  callOrPipeStageSubject,
  effectApiCall,
  objectLiteralArgument
} from "./reportedRuntimeSupport.js"

const runCollectNames = Array.of("runCollect")

const bufferNames = Array.of("buffer")

const capacityNames = Array.of("capacity")

const unboundedStreamCollectFinding = makeRuleFinding("unbounded-stream-collect")

const unboundedStreamBufferFinding = makeRuleFinding("unbounded-stream-buffer")

const isNonTestRole = Predicate.not(isTestRole)

const stringLiteralText = flow(
  unwrapTransparentExpression,
  Option.liftPredicate(ts.isStringLiteralLike),
  Option.map(Struct.get("text"))
)

export const unboundedStreamCollectFindings = (
  context: MatchContext,
  index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(
    roleForSourceFile(index, context.sourceFile),
    Option.filter(isNonTestRole),
    Option.flatMap(() => callOrPipeStageSubject(context.checker)("Stream")(runCollectNames)(node)),
    Option.map(unboundedStreamCollectFinding("Stream.runCollect")),
    Option.toArray
  )

const capacityPropertyAssignment = (object: ts.ObjectLiteralExpression) =>
  pipe(propertyAssignmentNamed(object, capacityNames), Option.filter(ts.isPropertyAssignment))

const bufferCapacityIsUnbounded = (expression: ts.Expression) =>
  pipe(
    objectLiteralArgument(expression),
    Option.flatMap(capacityPropertyAssignment),
    Option.map(Struct.get("initializer")),
    Option.flatMap(stringLiteralText),
    Option.contains("unbounded")
  )

const unboundedBufferOptions = (call: ts.CallExpression) => {
  const direct = pipe(callArgumentAt(0)(call), Option.exists(bufferCapacityIsUnbounded))
  const dataFirst = pipe(callArgumentAt(1)(call), Option.exists(bufferCapacityIsUnbounded))

  return direct || dataFirst
}

export const unboundedStreamBufferFindings = (
  context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> => {
  const matchesBuffer = effectApiCall(context.checker)("Stream")(bufferNames)

  return pipe(
    callExpressionOf(node),
    Option.filter(matchesBuffer),
    Option.filter(unboundedBufferOptions),
    Option.map(unboundedStreamBufferFinding('Stream.buffer({ capacity: "unbounded" })')),
    Option.toArray
  )
}
