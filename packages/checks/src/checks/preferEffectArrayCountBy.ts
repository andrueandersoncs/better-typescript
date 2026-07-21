import * as path from "node:path"
import { Array, Function, Option, pipe, Struct } from "effect"
import * as ts from "typescript"
import {
  resolvedSymbolAt,
  unwrapCallee,
  unwrapCarrier,
  unwrapTransparentExpression
} from "./support/tsNode.js"
import { identifierTextIsPipe } from "./effectQuality/reportedRuntimeSupport.js"
import { symbolDeclaredInEffectPackage } from "./support/tsSignature.js"
import { makeCheck } from "../defineCheck.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { makeDetection } from "@better-typescript/core/engine/check"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const message = "Avoid filtering an array only to count matching elements."

const hint =
  "Replace Array.filter(values, predicate).length with Array.countBy(values, predicate) from " +
  "Effect. Remove a surrounding helper when that is its only behavior."

const effectArrayModuleFileNames = Array.make("Array.ts", "Array.d.ts")

const symbolIsFromEffectArrayModule = (symbol: ts.Symbol) => {
  const declarations = symbol.getDeclarations() ?? Array.empty()

  const declaredInArrayModule = Array.some(declarations, (declaration) => {
    const sourceFile = declaration.getSourceFile()
    const fileName = path.basename(sourceFile.fileName)

    return Array.contains(effectArrayModuleFileNames, fileName)
  })

  return symbolDeclaredInEffectPackage(symbol) && declaredInArrayModule
}

const propertyNameIsFilter = (access: ts.PropertyAccessExpression) =>
  strictEqual("filter")(access.name.text)

const effectArrayFilterAccess =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): Option.Option<ts.PropertyAccessExpression> => {
    const accessIsEffectArrayFilter = (access: ts.PropertyAccessExpression) =>
      pipe(resolvedSymbolAt(checker)(access.name), Option.exists(symbolIsFromEffectArrayModule))

    return pipe(
      call.expression,
      unwrapCallee,
      unwrapTransparentExpression,
      Option.liftPredicate(ts.isPropertyAccessExpression),
      Option.filter(propertyNameIsFilter),
      Option.filter(accessIsEffectArrayFilter)
    )
  }

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

const effectArrayFilterLengthMatches = (context: CheckContext) => {
  const match = makeDetection(context)
  const isFilteredArray = isFilteredArrayCall(context.checker)

  const matches = (access: ts.PropertyAccessExpression): ReadonlyArray<Detection> =>
    pipe(
      Option.some(access),
      Option.filter(propertyNameIsLength),
      Option.map(accessExpressionCarrier),
      Option.filter(ts.isCallExpression),
      Option.filter(isFilteredArray),
      Option.map(() => match({ node: access, message, hint })),
      Option.toArray
    )

  return matches
}

const propertyAccessKinds = Array.of(ts.SyntaxKind.PropertyAccessExpression)

export const preferEffectArrayCountBy = makeCheck(
  "prefer-effect-array-count-by",
  propertyAccessKinds,
  ts.isPropertyAccessExpression,
  effectArrayFilterLengthMatches
)
