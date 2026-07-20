import { Array, Function, Option, Predicate, flow, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { enclosingFunctionLike } from "../functionalCoreEffect/support.js"
import { callExpressionOf } from "../support/tsNode.js"
import type { EffectQualityIndex } from "./index.js"
import { callIsResponseJson } from "./effectIdentity.js"
import { emptyRuleFindings, makeRuleFinding } from "./makeFindings.js"
import {
  callIsHttpResponseSchema,
  callIsSchemaDecode,
  functionBodyContains,
  sourceHasAdapterRole
} from "./reportedHttpResponseShared.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const responseValidationFinding = makeRuleFinding("http-response-validation")

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
    const argumentEqualsCall = (argument: ts.Expression) => strictEqual(argument, call)
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

// Parent decode form is valid because Schema.decodeUnknown(response.json()) nests the body read.
const responseBodyHasNearbyValidation = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const parent = call.parent
  const parentCall = callExpressionOf(parent)
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

const findingsForUnvalidatedResponse = flow(responseValidationFinding("response.json"), Array.of)

export const httpResponseValidationFindings =
  (context: CheckContext) => (index: EffectQualityIndex) => (node: ts.Node) => {
    const adapterSource = sourceHasAdapterRole(index)(context.sourceFile)

    if (!adapterSource) {
      return emptyRuleFindings
    }

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
      Option.getOrElse(Function.constant(emptyRuleFindings))
    )
  }
