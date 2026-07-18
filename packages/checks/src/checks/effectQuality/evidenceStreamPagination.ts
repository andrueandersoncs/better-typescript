import { Array, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { foldAst } from "@better-typescript/core/engine/sources"
import type { ArchitectureRole } from "../support/architectureRole.js"
import { enclosingFunctionLike } from "../functionalCoreEffect/support.js"
import { isTestRole } from "./architectureRoles.js"
import { emptyAdviceFindings, makeAdviceFinding } from "./makeFindings.js"
import type { EffectQualityAdviceFinding } from "./findings.js"
import { callIsEffectApi, isProductionRole } from "./evidenceSupport.js"

const streamPaginateNames = Array.of("paginate")

const pageTokenPattern =
  /(?:pageToken|nextPageToken|nextCursor|cursor|continuation|pageKey|offset)/i

const pageTokenNode = (current: ts.Node) => {
  if (ts.isIdentifier(current)) {
    return pageTokenPattern.test(current.text)
  }

  const isStringLiteral = ts.isStringLiteralLike(current)

  return isStringLiteral ? pageTokenPattern.test(current.text) : isStringLiteral
}

const isPageTokenLoop = (node: ts.Node) => {
  const isWhile = ts.isWhileStatement(node)
  const isDo = ts.isDoStatement(node)
  const isFor = ts.isForStatement(node)
  const isLoop = Array.make(isWhile, isDo, isFor)
  const loopNode = Array.some(isLoop, Boolean)

  if (!loopNode) {
    return loopNode
  }

  const reducer = (found: boolean, current: ts.Node) => {
    const hasPageToken = pageTokenNode(current)
    const signals = Array.make(found, hasPageToken)

    return Array.some(signals, Boolean)
  }

  return foldAst(reducer)(node)(false)
}

const pageAccumulateMethods = Array.make("push", "concat", "append", "appendAll", "yield")

const pageAccumulateNode = (current: ts.Node) => {
  if (!ts.isCallExpression(current)) {
    return ts.isYieldExpression(current)
  }

  const isPropertyCallee = ts.isPropertyAccessExpression(current.expression)

  if (!isPropertyCallee) {
    return isPropertyCallee
  }

  const method = current.expression.name.text

  return Array.contains(pageAccumulateMethods, method)
}

const loopAccumulatesPages = (node: ts.Node) => {
  const reducer = (found: boolean, current: ts.Node) => {
    const accumulates = pageAccumulateNode(current)
    const signals = Array.make(found, accumulates)

    return Array.some(signals, Boolean)
  }

  return foldAst(reducer)(node)(false)
}

export const streamPagination =
  (context: CheckContext) =>
  (role: ArchitectureRole) =>
  (node: ts.Node): ReadonlyArray<EffectQualityAdviceFinding> => {
    const testRole = isTestRole(role)
    const nonProduction = !isProductionRole(role)
    const skip = Array.make(testRole, nonProduction)

    if (Array.some(skip, Boolean)) {
      return emptyAdviceFindings
    }

    const pageTokenLoop = isPageTokenLoop(node)
    const accumulates = loopAccumulatesPages(node)
    const eligible = Array.make(pageTokenLoop, accumulates)

    if (!Array.every(eligible, Boolean)) {
      return emptyAdviceFindings
    }

    // Stay quiet when Stream.paginate is already chosen because the preferred API is present.
    const usesPaginateReducer = (found: boolean, current: ts.Node) => {
      const isCall = ts.isCallExpression(current)

      const isPaginateCall =
        isCall && callIsEffectApi(context.checker)("Stream")(streamPaginateNames)(current)

      const signals = Array.make(found, isPaginateCall)

      return Array.some(signals, Boolean)
    }

    const scan = Function.flip(foldAst(usesPaginateReducer))(false)
    const usesPaginate = pipe(enclosingFunctionLike(node), Option.exists(scan))

    if (usesPaginate) {
      return emptyAdviceFindings
    }

    const finding = makeAdviceFinding("stream-pagination")("page-token loop")(node)

    return Array.of(finding)
  }
