import { callExpressionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Function, Option, Predicate, flow, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../internal/equivalence.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { callExpressionOf } from "../../internal/support/callExpressionOf.js"

import { enclosingFunctionLike } from "../../internal/support/effectApi/enclosingFunctionLike.js"

import { callIsResponseJson } from "../../internal/builtins/effectQuality/responseJson.js"

import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"

import {
  callIsHttpResponseSchema,
  callIsSchemaDecode,
  functionBodyContains
} from "../../internal/builtins/effectQuality/httpRulesShared.js"

const isSchemaOrHttpResponseValidation = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const schemaDecode = callIsSchemaDecode(checker)(call)
  const httpSchema = callIsHttpResponseSchema(checker)(call)
  const flags = Array.make(schemaDecode, httpSchema)

  return Array.some(flags, Boolean)
}

const callIsArgumentOfValidation =
  (validates: (call: ts.CallExpression) => boolean) =>
  (call: ts.CallExpression) =>
  (candidate: ts.CallExpression) => {
    const argumentEqualsCall = strictEqual(call)
    const isArgument = Array.some(candidate.arguments, argumentEqualsCall)
    const isValidation = validates(candidate)
    const flags = Array.make(isArgument, isValidation)

    return Array.every(flags, Boolean)
  }

const nodeIsValidationCall =
  (validates: (call: ts.CallExpression) => boolean) => (current: ts.Node) => {
    const asCall = callExpressionOf(current)

    return Option.exists(asCall, validates)
  }

const responseBodyHasNearbyValidation = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const parentCall = callExpressionOf(call.parent)
  const validates = isSchemaOrHttpResponseValidation(checker)
  const directParentValidation = Option.exists(parentCall, validates)

  const argumentOfValidation = Option.exists(
    parentCall,
    callIsArgumentOfValidation(validates)(call)
  )

  // Function-scope decode is enough because yield* response.json() may decode later in the body.
  const validationInBody = nodeIsValidationCall(validates)
  const bodyContainsValidation = functionBodyContains(validationInBody)
  const functionBodyOf = (fn: ts.FunctionLikeDeclaration) => Option.fromNullishOr(fn.body)

  const functionScopeValidation = pipe(
    enclosingFunctionLike(call),
    Option.flatMap(functionBodyOf),
    Option.exists(bodyContainsValidation)
  )

  const flags = Array.make(directParentValidation, argumentOfValidation, functionScopeValidation)

  return Array.some(flags, Boolean)
}

const findingsForUnvalidatedResponse = flow(makeSubjectMatch("response.json"), Array.of)

const httpResponseValidationFindings = (context: MatchContext) => (node: ts.Node) => {
  const hasNearbyValidation = responseBodyHasNearbyValidation(context.checker)
  const isHttpSchema = callIsHttpResponseSchema(context.checker)
  const isSchemaDecode = callIsSchemaDecode(context.checker)

  return pipe(
    callExpressionOf(node),
    Option.filter(callIsResponseJson),
    Option.filter(Predicate.not(hasNearbyValidation)),
    Option.filter(Predicate.not(isHttpSchema)),
    Option.filter(Predicate.not(isSchemaDecode)),
    Option.map(findingsForUnvalidatedResponse),
    Option.getOrElse(Function.constant(noSubjectMatches))
  )
}

const httpResponseValidationScanner = makeNodeScanner(callExpressionKinds)(ts.isCallExpression)(
  httpResponseValidationFindings
)

export const httpResponseValidation = makeRule("http-response-validation")(
  httpResponseValidationScanner
)(
  fixedRuleMessage(
    "Decode unknown HTTP response data with Schema at the adapter boundary.",
    "Apply Schema.decodeUnknownEffect or an HttpClient response schema decoder."
  )
)
