import { objectLiteralArgument } from "../../internal/support/objectLiteralArgument.js"
import { effectQualityRuntimeKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Option, Struct, flow, pipe } from "effect"

import * as ts from "typescript"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { acceptsNode } from "../../internal/scanner/acceptsNode.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { callExpressionOf } from "../../internal/support/callExpressionOf.js"

import { propertyAssignmentNamed } from "../../internal/support/effectApi/propertyAssignments.js"

import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"

import {
  callArgumentAt,
  effectApiCall
} from "../../internal/builtins/effectQuality/effectApiFacts.js"

import { makeSubjectMatch } from "../../internal/builtins/effectQuality/subjectMatch.js"

const bufferNames = Array.of("buffer")

const capacityNames = Array.of("capacity")

const stringLiteralText = flow(
  unwrapTransparentExpression,
  Option.liftPredicate(ts.isStringLiteralLike),
  Option.map(Struct.get("text"))
)

const capacityPropertyAssignment = (object: ts.ObjectLiteralExpression) =>
  pipe(propertyAssignmentNamed(capacityNames)(object), Option.filter(ts.isPropertyAssignment))

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

const unboundedStreamBufferFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const matchesBuffer = effectApiCall(context.checker)("Stream")(bufferNames)

    return pipe(
      callExpressionOf(node),
      Option.filter(matchesBuffer),
      Option.filter(unboundedBufferOptions),
      Option.map(makeSubjectMatch('Stream.buffer({ capacity: "unbounded" })')),
      Option.toArray
    )
  }

const unboundedStreamBufferScanner = makeNodeScanner(effectQualityRuntimeKinds)(acceptsNode)(
  unboundedStreamBufferFindings
)

export const unboundedStreamBuffer = makeRule("unbounded-stream-buffer")(
  unboundedStreamBufferScanner
)(
  fixedRuleMessage(
    "Avoid unbounded Stream buffers.",
    "Use natural backpressure or a bounded buffer strategy."
  )
)
