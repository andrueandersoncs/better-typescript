import { Array, Function, Option, Struct, flow, pipe } from "effect"

import * as ts from "typescript"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { acceptsNode } from "../../internal/scanner/acceptsNode.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { foldAst } from "../../internal/sources/foldAst.js"

import { enclosingFunctionLike } from "../../internal/support/effectApi/enclosingFunctionLike.js"

import { callIsEffectApi } from "../../internal/builtins/effectQuality/callIsEffectApi.js"

import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"

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

  const reducer = (found: boolean) => (current: ts.Node) => {
    const hasPageToken = pageTokenNode(current)
    const signals = Array.make(found, hasPageToken)

    return Array.some(signals, Boolean)
  }

  const uncurriedReducer = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
    reducer(found)(current)
  )

  return foldAst(uncurriedReducer)(node)(false)
}

const pageAccumulateMethods = Array.make("push", "concat", "append", "appendAll", "yield")

const propertyAccessNameText = flow(
  Struct.get<ts.PropertyAccessExpression, "name">("name"),
  Struct.get("text")
)

const accumulatesPageMethod = (access: ts.PropertyAccessExpression) => {
  const method = propertyAccessNameText(access)

  return Array.contains(pageAccumulateMethods, method)
}

const pageAccumulateNode = (current: ts.Node) => {
  if (!ts.isCallExpression(current)) {
    return ts.isYieldExpression(current)
  }

  const propertyCallee = Option.liftPredicate(ts.isPropertyAccessExpression)(current.expression)

  return Option.exists(propertyCallee, accumulatesPageMethod)
}

const loopAccumulatesPages = (node: ts.Node) => {
  const reducer = (found: boolean) => (current: ts.Node) => {
    const accumulates = pageAccumulateNode(current)
    const signals = Array.make(found, accumulates)

    return Array.some(signals, Boolean)
  }

  const uncurriedReducer = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
    reducer(found)(current)
  )

  return foldAst(uncurriedReducer)(node)(false)
}

const streamPaginationCandidates =
  (context: MatchContext) =>
  (node: ts.Node): ReadonlyArray<ScannerMatch<string>> => {
    const pageTokenLoop = isPageTokenLoop(node)
    const accumulates = loopAccumulatesPages(node)
    const eligible = Array.make(pageTokenLoop, accumulates)

    if (!Array.every(eligible, Boolean)) {
      return noSubjectMatches
    }

    // Stay quiet when Stream.paginate is already chosen because the preferred API is present.
    const usesPaginateStep = (found: boolean) => (current: ts.Node) => {
      const isCall = ts.isCallExpression(current)

      const isPaginateCall =
        isCall && callIsEffectApi(context.checker)("Stream")(streamPaginateNames)(current)

      const signals = Array.make(found, isPaginateCall)

      return Array.some(signals, Boolean)
    }

    const uncurriedReducer = Function.untupled(([found, current]: readonly [boolean, ts.Node]) =>
      usesPaginateStep(found)(current)
    )

    const scan = Function.flip(foldAst(uncurriedReducer))(false)
    const usesPaginate = pipe(enclosingFunctionLike(node), Option.exists(scan))

    if (usesPaginate) {
      return noSubjectMatches
    }

    const finding = makeSubjectMatch("page-token loop")(node)

    return Array.of(finding)
  }

const paginationKinds = Array.make(
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.ForStatement
)

const streamPaginationScanner = makeNodeScanner(paginationKinds)(acceptsNode)(
  streamPaginationCandidates
)

export const streamPagination = makeRule("stream-pagination")(streamPaginationScanner)(
  fixedRuleMessage(
    "Prefer Stream.paginate.",
    "Use Stream.paginate for an effectful token-based page source."
  )
)
