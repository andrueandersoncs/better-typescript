import { callExpressionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Data, Match as EffectMatch, Function, Match, Option, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../internal/equivalence.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { foldAst } from "../../internal/sources/foldAst.js"

import { callExpressionOf } from "../../internal/support/callExpressionOf.js"

import { enclosingFunctionLike } from "../../internal/support/effectApi/enclosingFunctionLike.js"

import type { ImportedMember } from "../../internal/support/effectApi/importedMember.js"

import { importedMemberAt } from "../../internal/support/effectApi/importedMemberAt.js"

import { unwrapTransparentExpression } from "../../internal/support/transparentWrapper.js"

import { unwrapCallee } from "../../internal/support/unwrapCallee.js"

import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"

import {
  callIsImportedApi,
  memberIsHttpNamespaceApi,
  callIsHttpResponseSchema,
  callIsSchemaDecode,
  functionBodyContains,
  functionBodyOf
} from "../../internal/builtins/effectQuality/httpRulesShared.js"

// This state is explicit because the fold must remember status access before a body read.
class BodyStatusWalk extends Data.Class<{
  readonly sawBodyRead: boolean
  readonly sawStatusBefore: boolean
}> {}

const statusPropertyNames = Array.make("status", "ok", "statusText")

const literalIsStatusProperty = (literal: ts.StringLiteralLike) =>
  Array.contains(statusPropertyNames, literal.text)

const propertyAccessNameIsStatus = (access: ts.PropertyAccessExpression) =>
  Array.contains(statusPropertyNames, access.name.text)

const prefixUnaryAccessesStatus = (unary: ts.PrefixUnaryExpression) =>
  expressionAccessesStatus(unary.operand)

const postfixUnaryAccessesStatus = (unary: ts.PostfixUnaryExpression) =>
  expressionAccessesStatus(unary.operand)

const parenthesizedAccessesStatus = (parenthesized: ts.ParenthesizedExpression) =>
  expressionAccessesStatus(parenthesized.expression)

const asExpressionAccessesStatus = (asExpression: ts.AsExpression) =>
  expressionAccessesStatus(asExpression.expression)

const satisfiesExpressionAccessesStatus = (satisfiesExpression: ts.SatisfiesExpression) =>
  expressionAccessesStatus(satisfiesExpression.expression)

const statusAccessOfExpression = (current: ts.Expression): boolean =>
  pipe(
    Match.value(current),
    Match.when(ts.isPropertyAccessExpression, (access) => {
      const nameHit = propertyAccessNameIsStatus(access)
      const nested = expressionAccessesStatus(access.expression)
      const flags = Array.make(nameHit, nested)

      return Array.some(flags, Boolean)
    }),
    Match.when(ts.isElementAccessExpression, (access) => {
      const argument = unwrapTransparentExpression(access.argumentExpression)

      const literalStatus = pipe(
        Option.liftPredicate(ts.isStringLiteralLike)(argument),
        Option.exists(literalIsStatusProperty)
      )

      const nested = expressionAccessesStatus(access.expression)
      const flags = Array.make(literalStatus, nested)

      return Array.some(flags, Boolean)
    }),
    Match.when(ts.isCallExpression, (call) => {
      const callee = unwrapTransparentExpression(call.expression)
      const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(callee)

      return pipe(propertyAccess, Option.exists(propertyAccessNameIsStatus))
    }),
    Match.when(ts.isBinaryExpression, (binary) => {
      const left = expressionAccessesStatus(binary.left)
      const right = expressionAccessesStatus(binary.right)
      const flags = Array.make(left, right)

      return Array.some(flags, Boolean)
    }),
    Match.when(ts.isPrefixUnaryExpression, prefixUnaryAccessesStatus),
    Match.when(ts.isPostfixUnaryExpression, postfixUnaryAccessesStatus),
    Match.when(ts.isParenthesizedExpression, parenthesizedAccessesStatus),
    Match.when(ts.isAsExpression, asExpressionAccessesStatus),
    Match.when(ts.isSatisfiesExpression, satisfiesExpressionAccessesStatus),
    Match.when(ts.isConditionalExpression, (conditional) => {
      const condition = expressionAccessesStatus(conditional.condition)
      const whenTrue = expressionAccessesStatus(conditional.whenTrue)
      const whenFalse = expressionAccessesStatus(conditional.whenFalse)
      const flags = Array.make(condition, whenTrue, whenFalse)

      return Array.some(flags, Boolean)
    }),
    Match.orElse(Function.constFalse)
  )

const expressionAccessesStatus = (expression: ts.Expression): boolean =>
  pipe(expression, unwrapTransparentExpression, statusAccessOfExpression)

const httpClientRequestNames = Array.make(
  "execute",
  "get",
  "head",
  "post",
  "put",
  "patch",
  "del",
  "options"
)

const httpStatusClassifyNames = Array.make("filterStatusOk", "filterStatus", "matchStatus")

const responseBodyNames = Array.make("json", "text", "arrayBuffer", "blob", "formData", "bytes")

const propertyAccessIsResponseBody = (access: ts.PropertyAccessExpression) =>
  Array.contains(responseBodyNames, access.name.text)

const callIsResponseBodyRead = (call: ts.CallExpression) => {
  const callee = unwrapTransparentExpression(call.expression)
  const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(callee)

  return pipe(propertyAccess, Option.exists(propertyAccessIsResponseBody))
}

const memberSubject = (member: ImportedMember) => {
  const path = Array.join(member.path, ".")

  return strictEqual(0)(path.length) ? member.moduleSpecifier : `${member.moduleSpecifier}:${path}`
}

const propertyAccessIsHttpClientRequest = (access: ts.PropertyAccessExpression) =>
  Array.contains(httpClientRequestNames, access.name.text)

const callIsHttpClientRequest = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const importedPredicate = memberIsHttpNamespaceApi(httpClientRequestNames)
  const importedLookup = callIsImportedApi(importedPredicate)(checker)
  const imported = importedLookup(call.expression)
  const callee = unwrapTransparentExpression(call.expression)
  const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(callee)
  const propertyNamed = pipe(propertyAccess, Option.exists(propertyAccessIsHttpClientRequest))
  const flags = Array.make(imported, propertyNamed)

  return Array.some(flags, Boolean)
}

const binaryAccessesStatus = (binary: ts.BinaryExpression) => {
  const left = expressionAccessesStatus(binary.left)
  const right = expressionAccessesStatus(binary.right)
  const flags = Array.make(left, right)

  return Array.some(flags, Boolean)
}

const propertyAccessIsStatus = (access: ts.PropertyAccessExpression) =>
  Array.contains(statusPropertyNames, access.name.text)

const ifStatementAccessesStatus = (statement: ts.IfStatement) =>
  expressionAccessesStatus(statement.expression)

const conditionalAccessesStatus = (conditional: ts.ConditionalExpression) =>
  expressionAccessesStatus(conditional.condition)

const nodeClassifiesStatus =
  (checker: ts.TypeChecker) =>
  (node: ts.Node): boolean => {
    const isStatusClassify = callIsImportedApi(memberIsHttpNamespaceApi(httpStatusClassifyNames))(
      checker
    )

    const callExpressionIsStatusClassify = (call: ts.CallExpression) =>
      isStatusClassify(call.expression)

    return pipe(
      EffectMatch.value(node),
      EffectMatch.when(ts.isCallExpression, callExpressionIsStatusClassify),
      EffectMatch.when(ts.isPropertyAccessExpression, propertyAccessIsStatus),
      EffectMatch.when(ts.isBinaryExpression, binaryAccessesStatus),
      EffectMatch.when(ts.isIfStatement, ifStatementAccessesStatus),
      EffectMatch.when(ts.isConditionalExpression, conditionalAccessesStatus),
      EffectMatch.orElse(Function.constFalse)
    )
  }

const walkBodyStatus =
  (classify: (node: ts.Node) => boolean) =>
  (bodyRead: ts.CallExpression) =>
  (state: BodyStatusWalk) =>
  (current: ts.Node): BodyStatusWalk => {
    if (state.sawBodyRead) {
      return state
    }

    if (strictEqual(bodyRead)(current)) {
      return new BodyStatusWalk({
        sawBodyRead: true,
        sawStatusBefore: state.sawStatusBefore
      })
    }

    if (classify(current)) {
      return new BodyStatusWalk({
        sawBodyRead: false,
        sawStatusBefore: true
      })
    }

    return state
  }

const bodyReadPrecedesStatus =
  (checker: ts.TypeChecker) => (bodyRead: ts.CallExpression) => (body: ts.ConciseBody) => {
    const classify = nodeClassifiesStatus(checker)
    const step = walkBodyStatus(classify)(bodyRead)

    const uncurriedStep = Function.untupled(
      ([state, current]: readonly [BodyStatusWalk, ts.Node]) => step(state)(current)
    )

    const initial = new BodyStatusWalk({
      sawBodyRead: false,
      sawStatusBefore: false
    })

    const result = foldAst(uncurriedStep)(body)(initial)
    const noStatusBefore = !result.sawStatusBefore
    const flags = Array.make(result.sawBodyRead, noStatusBefore)

    return Array.every(flags, Boolean)
  }

const callLooksHttpRelated =
  (checker: ts.TypeChecker) =>
  (call: ts.CallExpression): boolean => {
    const isStatusClassify = callIsImportedApi(memberIsHttpNamespaceApi(httpStatusClassifyNames))(
      checker
    )

    const clientRequest = callIsHttpClientRequest(checker)(call)
    const statusClassify = isStatusClassify(call.expression)
    const bodyRead = callIsResponseBodyRead(call)
    const flags = Array.make(clientRequest, statusClassify, bodyRead)

    return Array.some(flags, Boolean)
  }

const nodeIsHttpRelatedCall = (checker: ts.TypeChecker) => (current: ts.Node) => {
  const asCall = callExpressionOf(current)

  return Option.exists(asCall, callLooksHttpRelated(checker))
}

const isBodyDecodeCall = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const bodyRead = callIsResponseBodyRead(call)
  const schemaDecode = callIsSchemaDecode(checker)(call)
  const httpSchema = callIsHttpResponseSchema(checker)(call)
  const flags = Array.make(bodyRead, schemaDecode, httpSchema)

  return Array.some(flags, Boolean)
}

const bodyLooksHttpRelated = (checker: ts.TypeChecker) => (node: ts.CallExpression) => {
  const rawBody = callIsResponseBodyRead(node)
  const httpSchema = callIsHttpResponseSchema(checker)(node)
  const schemaDecode = callIsSchemaDecode(checker)(node)
  const relatedCall = nodeIsHttpRelatedCall(checker)
  const bodyContainsRelated = functionBodyContains(relatedCall)

  const hasHttpClient = pipe(
    enclosingFunctionLike(node),
    Option.flatMap(functionBodyOf),
    Option.exists(bodyContainsRelated)
  )

  const schemaWithHttpFlags = Array.make(schemaDecode, hasHttpClient)
  const schemaWithHttp = Array.every(schemaWithHttpFlags, Boolean)
  const flags = Array.make(rawBody, httpSchema, schemaWithHttp)

  return Array.some(flags, Boolean)
}

const bodyReadSubject = (node: ts.CallExpression) => {
  const expression = unwrapTransparentExpression(node.expression)
  const access = Option.liftPredicate(ts.isPropertyAccessExpression)(expression)

  return pipe(
    access,
    Option.map((property) => `response.${property.name.text}`),
    Option.getOrElse(Function.constant("response body"))
  )
}

const importedDecodeSubject = (context: MatchContext) => (node: ts.CallExpression) => {
  const callee = unwrapCallee(node.expression)
  const member = importedMemberAt(context.checker)(callee)

  return pipe(
    member,
    Option.map(memberSubject),
    Option.getOrElse(Function.constant("response decode"))
  )
}

const statusDecodeSubject = (context: MatchContext) => (node: ts.CallExpression) =>
  callIsResponseBodyRead(node) ? bodyReadSubject(node) : importedDecodeSubject(context)(node)

const bodyReadPrecedesInFunction =
  (precedesStatus: (call: ts.CallExpression) => (body: ts.ConciseBody) => boolean) =>
  (call: ts.CallExpression) =>
    pipe(
      enclosingFunctionLike(call),
      Option.flatMap(functionBodyOf),
      Option.exists(precedesStatus(call))
    )

const findingsForCall =
  (subjectOf: (call: ts.CallExpression) => string) => (call: ts.CallExpression) => {
    const subject = subjectOf(call)
    const finding = makeSubjectMatch(subject)(call)

    return Array.of(finding)
  }

const httpStatusDecodeOrderFindings = (context: MatchContext) => (node: ts.Node) => {
  const isBodyDecode = isBodyDecodeCall(context.checker)
  const precedesStatus = bodyReadPrecedesStatus(context.checker)
  const looksHttpRelated = bodyLooksHttpRelated(context.checker)
  const subjectOf = statusDecodeSubject(context)
  const precedesInFunction = bodyReadPrecedesInFunction(precedesStatus)
  // Report only HTTP-looking body reads because raw response.* or HttpClient schema indicate HTTP
  const toFindings = findingsForCall(subjectOf)

  return pipe(
    callExpressionOf(node),
    Option.filter(isBodyDecode),
    Option.filter(precedesInFunction),
    Option.filter(looksHttpRelated),
    Option.map(toFindings),
    Option.getOrElse(Function.constant(noSubjectMatches))
  )
}

const httpStatusDecodeOrderScanner = makeNodeScanner(callExpressionKinds)(ts.isCallExpression)(
  httpStatusDecodeOrderFindings
)

export const httpStatusDecodeOrder = makeRule("http-status-decode-order")(
  httpStatusDecodeOrderScanner
)(
  fixedRuleMessage(
    "Classify HTTP status before decoding a successful response body.",
    "Apply filterStatusOk or an equivalent response classifier first."
  )
)
