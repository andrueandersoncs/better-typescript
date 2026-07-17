import * as path from "node:path"
import { Array, Option, Struct, pipe } from "effect"
import * as ts from "typescript"
import {
  resolvedSymbolAt,
  unwrapCallee,
  unwrapCarrier,
  unwrapTransparentExpression
} from "./support/tsNode.js"
import { symbolDeclaredInEffectPackage } from "./support/tsSignature.js"
import { defineCheck } from "../defineCheck.js"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"
import { detection } from "@better-typescript/core/engine/check"

const message = "Avoid filtering an array only to count matching elements."

const hint =
  "Replace Array.filter(values, predicate).length with Array.countBy(values, predicate) from " +
  "Effect. Remove a surrounding helper when that is its only behavior."

const effectArrayModuleFileNames = Array.make("Array.ts", "Array.d.ts")

const symbolIsFromEffectArrayModule = (symbol: ts.Symbol): boolean => {
  const declarations = symbol.getDeclarations() ?? Array.empty()

  const declaredInArrayModule = Array.some(declarations, (declaration) => {
    const sourceFile = declaration.getSourceFile()
    const fileName = path.basename(sourceFile.fileName)

    return Array.contains(effectArrayModuleFileNames, fileName)
  })

  return symbolDeclaredInEffectPackage(symbol) && declaredInArrayModule
}

const effectArrayFilterAccess =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): Option.Option<ts.PropertyAccessExpression> =>
    pipe(
      call.expression,
      unwrapCallee,
      unwrapTransparentExpression,
      Option.liftPredicate(ts.isPropertyAccessExpression),
      Option.filter((access) => access.name.text === "filter"),
      Option.filter((access) =>
        pipe(resolvedSymbolAt(checker)(access.name), Option.exists(symbolIsFromEffectArrayModule))
      )
    )

const calleeNameNode = (call: ts.CallExpression): Option.Option<ts.Identifier> => {
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

const isEffectPipeEndingInArrayFilter =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): boolean => {
    const isEffectPipe = pipe(
      calleeNameNode(call),
      Option.filter((name) => name.text === "pipe"),
      Option.flatMap(resolvedSymbolAt(checker)),
      Option.exists(symbolDeclaredInEffectPackage)
    )

    const hasDataAndStage = call.arguments.length >= 2
    const isEligiblePipe = isEffectPipe && hasDataAndStage

    const lastStageIsArrayFilter = pipe(
      Array.last(call.arguments),
      Option.filter(ts.isCallExpression),
      Option.filter((stage) => stage.arguments.length === 1),
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

const effectArrayFilterLengthMatches = (context: CheckContext) => {
  const match = detection(context)
  const isFilteredArray = isFilteredArrayCall(context.checker)

  const matches = (access: ts.PropertyAccessExpression): ReadonlyArray<Detection> =>
    pipe(
      Option.some(access),
      Option.filter((candidate) => candidate.name.text === "length"),
      Option.map((candidate) => unwrapCarrier(candidate.expression)),
      Option.filter(ts.isCallExpression),
      Option.filter(isFilteredArray),
      Option.map(() => match({ node: access, message, hint })),
      Option.toArray
    )

  return matches
}

const propertyAccessKinds = Array.of(ts.SyntaxKind.PropertyAccessExpression)

export const preferEffectArrayCountBy = defineCheck(
  "prefer-effect-array-count-by",
  propertyAccessKinds,
  ts.isPropertyAccessExpression,
  effectArrayFilterLengthMatches
)
