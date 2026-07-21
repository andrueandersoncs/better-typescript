import { Array, Function, Match, Option, pipe } from "effect"
import * as ts from "typescript"
import type { MatchContext } from "@better-typescript/matchers/matcher/data"
import { foldAst } from "@better-typescript/matchers/sources"
import { importedMemberAt, type ImportedMember } from "../functionalCoreEffect/importedMembers.js"
import { callExpressionOf, unwrapCallee } from "../../support/tsNode.js"
import type { EffectQualityRuleFinding } from "./findings.js"
import type { EffectQualityIndex } from "./index.js"
import { makeRuleFinding } from "./makeFindings.js"
import {
  callArgumentAt,
  effectApiCall,
  effectApiReference,
  isExpressionReferenceNode,
  layerAcquisitionNames
} from "./reportedRuntimeSupport.js"

const foreverNames = Array.of("forever")

const forkScopedNames = Array.of("forkScoped")

const streamRunNames = Array.make("runCollect", "runDrain", "runForEach", "runFold", "runFoldWhile")

const layerForeverAcquisitionFinding = makeRuleFinding("layer-forever-acquisition")

const expressionContainsEffectApi =
  (checker: ts.TypeChecker) =>
  (namespace: string) =>
  (names: ReadonlyArray<string>) =>
  (expression: ts.Expression) => {
    const onCall = effectApiCall(checker)(namespace)(names)
    const onReference = effectApiReference(checker)(namespace)(names)

    const visitNode = (current: ts.Node) =>
      pipe(
        Match.value(current),
        Match.when(ts.isCallExpression, onCall),
        Match.when(isExpressionReferenceNode, onReference),
        Match.orElse(Function.constFalse)
      )

    const step = (found: boolean, current: ts.Node) => (found ? true : visitNode(current))

    return foldAst(step)(expression)(false)
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
    const member = importedMemberAt(checker, callee)
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
    Option.map(() => layerForeverAcquisitionFinding("Layer.effect")(call))
  )

export const layerForeverAcquisitionFindings = (
  context: MatchContext,
  _index: EffectQualityIndex,
  node: ts.Node
): ReadonlyArray<EffectQualityRuleFinding> =>
  pipe(callExpressionOf(node), Option.flatMap(layerForeverFinding(context.checker)), Option.toArray)
