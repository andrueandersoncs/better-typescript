import { Array, Function, Option, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import { enclosingFunctionLike, importedMemberAt } from "../functionalCoreEffect/support.js"
import { callExpressionOf, unwrapCallee, unwrapTransparentExpression } from "../support/tsNode.js"
import type { EffectQualityIndex } from "./index.js"
import { memberSubject } from "./importedMembers.js"
import { emptyRuleFindings, makeRuleFinding } from "./makeFindings.js"
import {
  callIsHttpResponseSchema,
  callIsSchemaDecode,
  functionBodyContains,
  sourceHasAdapterRole
} from "./reportedHttpResponseShared.js"
import {
  bodyReadPrecedesStatus,
  callIsResponseBodyRead,
  isBodyDecodeCall,
  nodeIsHttpRelatedCall
} from "./reportedHttpStatusClassify.js"

const statusDecodeOrderFinding = makeRuleFinding("http-status-decode-order")

const bodyLooksHttpRelated = (checker: ts.TypeChecker) => (node: ts.CallExpression) => {
  const rawBody = callIsResponseBodyRead(node)
  const httpSchema = callIsHttpResponseSchema(checker)(node)
  const schemaDecode = callIsSchemaDecode(checker)(node)
  const relatedCall = nodeIsHttpRelatedCall(checker)
  const bodyContainsRelated = functionBodyContains(relatedCall)

  const hasHttpClient = pipe(
    enclosingFunctionLike(node),
    Option.flatMap((fn) => Option.fromNullishOr(fn.body)),
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

const importedDecodeSubject = (context: CheckContext) => (node: ts.CallExpression) => {
  const callee = unwrapCallee(node.expression)
  const member = importedMemberAt(context.checker, callee)

  return pipe(
    member,
    Option.map(memberSubject),
    Option.getOrElse(Function.constant("response decode"))
  )
}

const statusDecodeSubject = (context: CheckContext) => (node: ts.CallExpression) =>
  callIsResponseBodyRead(node) ? bodyReadSubject(node) : importedDecodeSubject(context)(node)

// schemaBodyJson already classifies status first because matchStatus wrappers own that order.
const bodyReadPrecedesInFunction =
  (precedesStatus: (call: ts.CallExpression) => (body: ts.ConciseBody) => boolean) =>
  (call: ts.CallExpression) =>
    pipe(
      enclosingFunctionLike(call),
      Option.flatMap((fn) => Option.fromNullishOr(fn.body)),
      Option.exists(precedesStatus(call))
    )

const findingsForCall =
  (subjectOf: (call: ts.CallExpression) => string) => (call: ts.CallExpression) => {
    const subject = subjectOf(call)
    const finding = statusDecodeOrderFinding(subject)(call)

    return Array.of(finding)
  }

export const httpStatusDecodeOrderFindings =
  (context: CheckContext) => (index: EffectQualityIndex) => (node: ts.Node) => {
    const adapterSource = sourceHasAdapterRole(index)(context.sourceFile)

    if (!adapterSource) {
      return emptyRuleFindings
    }

    const checker = context.checker
    const isBodyDecode = isBodyDecodeCall(checker)
    const precedesStatus = bodyReadPrecedesStatus(checker)
    const looksHttpRelated = bodyLooksHttpRelated(checker)
    const subjectOf = statusDecodeSubject(context)
    const precedesInFunction = bodyReadPrecedesInFunction(precedesStatus)
    // Report only HTTP-looking body reads because raw response.* or HttpClient schema signal HTTP flow.
    const toFindings = findingsForCall(subjectOf)

    return pipe(
      callExpressionOf(node),
      Option.filter(isBodyDecode),
      Option.filter(precedesInFunction),
      Option.filter(looksHttpRelated),
      Option.map(toFindings),
      Option.getOrElse(Function.constant(emptyRuleFindings))
    )
  }
