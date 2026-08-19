import { Array, Function, Option, pipe, Struct, Schema } from "effect"
import * as ts from "typescript"
import { makeNodeScanner } from "../scanner/makeNodeScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { MatchContext } from "../scanner/matchContext.js"
import { resolvedSymbolAt } from "../support/resolvedSymbolAt.js"
import { unwrapTransparentExpression } from "../support/transparentWrapper.js"
import { unwrapCallee } from "../support/unwrapCallee.js"
import { unwrapCarrier } from "../support/unwrapCarrier.js"
import { symbolDeclaredInEffectPackage } from "../support/declarationInEffectPackage.js"
import { strictEqual } from "../equivalence.js"
import { effectArrayFilterAccess } from "./effectArrayFilterAccess.js"
import { identifierTextIsPipe } from "./effectQuality/identifierTextIsPipe.js"

// PreferEffectArrayCountByFact exists because its fields form one stable data contract used by the linter.
export const PreferEffectArrayCountByFact = Schema.Struct({})

export interface PreferEffectArrayCountByFact extends Schema.Schema.Type<
  typeof PreferEffectArrayCountByFact
> {}

// emptyPreferEffectArrayCountByFact exists because its fields form one stable data contract used by the linter.
export const emptyPreferEffectArrayCountByFact = PreferEffectArrayCountByFact.make({})

const calleeNameNode = (call: ts.CallExpression) => {
  const callee = pipe(call.expression, unwrapCallee, unwrapTransparentExpression)

  if (ts.isIdentifier(callee)) {
    return Option.some(callee)
  }

  return pipe(
    Option.liftPredicate(ts.isPropertyAccessExpression)(callee),
    Option.map(Struct.get("name")),
    Option.filter(ts.isIdentifier)
  )
}

const callHasSingleArgument = (stage: ts.CallExpression) => strictEqual(1)(stage.arguments.length)

const isEffectPipeEndingInArrayFilter =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): boolean => {
    const isEffectPipe = pipe(
      calleeNameNode(call),
      Option.filter(identifierTextIsPipe),
      Option.flatMap(resolvedSymbolAt(checker)),
      Option.exists(symbolDeclaredInEffectPackage)
    )

    const hasDataAndStage = call.arguments.length >= 2
    const isEligiblePipe = isEffectPipe && hasDataAndStage

    const lastStageIsArrayFilter = pipe(
      Array.last(call.arguments),
      Option.filter(ts.isCallExpression),
      Option.filter(callHasSingleArgument),
      Option.flatMap(effectArrayFilterAccess(checker)),
      Option.isSome
    )

    return isEligiblePipe && lastStageIsArrayFilter
  }

const isFilteredArrayCall =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): boolean => {
    const directFilter = pipe(effectArrayFilterAccess(checker)(call), Option.isSome)
    const pipedFilter = isEffectPipeEndingInArrayFilter(checker)(call)

    return directFilter || pipedFilter
  }

const accessExpressionCarrier = Function.flow(
  Struct.get<ts.PropertyAccessExpression, "expression">("expression"),
  unwrapCarrier
)

const propertyNameIsLength = (candidate: ts.PropertyAccessExpression) =>
  strictEqual("length")(candidate.name.text)

const effectArrayFilterLengthMatches = (context: MatchContext) => {
  const isFilteredArray = isFilteredArrayCall(context.checker)

  const matches = (access: ts.PropertyAccessExpression) =>
    pipe(
      Option.some(access),
      Option.filter(propertyNameIsLength),
      Option.map(accessExpressionCarrier),
      Option.filter(ts.isCallExpression),
      Option.filter(isFilteredArray),
      Option.map(() => {
        const match = makeNodeMatch(access, emptyPreferEffectArrayCountByFact)

        return match
      }),
      Option.toArray
    )

  return matches
}

const propertyAccessKinds = Array.of(ts.SyntaxKind.PropertyAccessExpression)

export const preferEffectArrayCountByScanner = makeNodeScanner(propertyAccessKinds)(
  ts.isPropertyAccessExpression
)(effectArrayFilterLengthMatches)
