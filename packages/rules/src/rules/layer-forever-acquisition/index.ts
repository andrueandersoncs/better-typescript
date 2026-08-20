import { layerAcquisitionNames } from "../../internal/builtins/effectQuality/layerAcquisitionNames.js"
import { effectQualityRuntimeKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Match as EffectMatch, Function, Option, pipe } from "effect"

import * as ts from "typescript"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { acceptsNode } from "../../internal/scanner/acceptsNode.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { foldAst } from "../../internal/sources/foldAst.js"

import { callExpressionOf } from "../../internal/support/callExpressionOf.js"

import type { ImportedMember } from "../../internal/support/effectApi/importedMember.js"

import { importedMemberAt } from "../../internal/support/effectApi/importedMemberAt.js"

import { unwrapCallee } from "../../internal/support/unwrapCallee.js"

import {
  callArgumentAt,
  effectApiCall,
  effectApiReference,
  isExpressionReferenceNode
} from "../../internal/builtins/effectQuality/effectApiFacts.js"

import { makeSubjectMatch } from "../../internal/builtins/effectQuality/subjectMatch.js"

const foreverNames = Array.of("forever")

const forkScopedNames = Array.of("forkScoped")

const streamRunNames = Array.make("runCollect", "runDrain", "runForEach", "runFold", "runFoldWhile")

const expressionContainsEffectApi =
  (checker: ts.TypeChecker) =>
  (namespace: string) =>
  (names: ReadonlyArray<string>) =>
  (expression: ts.Expression) => {
    const onCall = effectApiCall(checker)(namespace)(names)
    const onReference = effectApiReference(checker)(namespace)(names)

    const visitNode = (current: ts.Node) =>
      pipe(
        EffectMatch.value(current),
        EffectMatch.when(ts.isCallExpression, onCall),
        EffectMatch.when(isExpressionReferenceNode, onReference),
        EffectMatch.orElse(Function.constFalse)
      )

    const step = (found: boolean) => (current: ts.Node) => (found ? true : visitNode(current))

    const uncurriedStep = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
      step(found)(current)
    )

    return foldAst(uncurriedStep)(expression)(false)
  }

const lastImportedMemberPath = (value: ImportedMember) => Array.last(value.path)

const layerAcquisitionEffectArgument =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): Option.Option<ts.Expression> => {
    const matchesAcquisition = effectApiCall(checker)("Layer")(layerAcquisitionNames)

    if (!matchesAcquisition(call)) {
      return Option.none()
    }

    const callee = unwrapCallee(call.expression)
    const member = importedMemberAt(checker)(callee)
    const calleeMember = pipe(member, Option.flatMap(lastImportedMemberPath))
    const isEffectDual = Option.contains(calleeMember, "effect")

    if (isEffectDual) {
      return call.arguments.length >= 2 ? callArgumentAt(1)(call) : callArgumentAt(0)(call)
    }

    return callArgumentAt(0)(call)
  }

const acquisitionIsUnforkedForever = (checker: ts.TypeChecker) => (expression: ts.Expression) => {
  const contains = expressionContainsEffectApi(checker)
  const hasFork = contains("Effect")(forkScopedNames)(expression)
  const lacksFork = !hasFork
  const hasForever = contains("Effect")(foreverNames)(expression)
  const hasStreamForever = contains("Stream")(foreverNames)(expression)
  const hasStreamRun = contains("Stream")(streamRunNames)(expression)
  const foreverStreamRun = hasStreamForever && hasStreamRun
  const hasForeverLike = hasForever || foreverStreamRun

  return lacksFork && hasForeverLike
}

const layerForeverFinding = (checker: ts.TypeChecker) => (call: ts.CallExpression) =>
  pipe(
    layerAcquisitionEffectArgument(checker)(call),
    Option.filter(acquisitionIsUnforkedForever(checker)),
    Option.map(() => makeSubjectMatch("Layer.effect")(call))
  )

const layerForeverAcquisitionFindings =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> =>
    pipe(
      callExpressionOf(node),
      Option.flatMap(layerForeverFinding(context.checker)),
      Option.toArray
    )

const layerForeverAcquisitionScanner = makeNodeScanner(effectQualityRuntimeKinds)(acceptsNode)(
  layerForeverAcquisitionFindings
)

export const layerForeverAcquisition = makeRule("layer-forever-acquisition")(
  layerForeverAcquisitionScanner
)(
  fixedRuleMessage(
    "Fork long-lived work into the layer scope so acquisition completes.",
    "Run the worker with Effect.forkScoped, FiberSet, or FiberMap."
  )
)
