import { Array, Function, Match, Option, Schema, pipe } from "effect"
import * as ts from "typescript"
import { foldAst } from "@better-typescript/matchers/sources"
import { callExpressionOf, unwrapTransparentExpression } from "../../support/tsNode.js"
import {
  callIsHttpResponseSchema,
  callIsImportedApi,
  callIsSchemaDecode,
  memberIsHttpNamespaceApi
} from "./reportedHttpResponseShared.js"
import { expressionAccessesStatus, statusPropertyNames } from "./reportedHttpStatusAccess.js"
import { strictEqual } from "@better-typescript/matchers/equivalence"

export const responseBodyNames = Array.make(
  "json",
  "text",
  "arrayBuffer",
  "blob",
  "formData",
  "bytes"
)

export const httpStatusClassifyNames = Array.make("filterStatusOk", "filterStatus", "matchStatus")

export const httpClientRequestNames = Array.make(
  "execute",
  "get",
  "head",
  "post",
  "put",
  "patch",
  "del",
  "options"
)

// BodyStatusWalk tracks body-before-status order because that order is the rule subject.
export const BodyStatusWalk = Schema.Struct({
  sawBodyRead: Schema.Boolean,
  sawStatusBefore: Schema.Boolean
})

export interface BodyStatusWalk extends Schema.Schema.Type<typeof BodyStatusWalk> {}

const propertyAccessIsResponseBody = (access: ts.PropertyAccessExpression) =>
  Array.contains(responseBodyNames, access.name.text)

const propertyAccessIsHttpClientRequest = (access: ts.PropertyAccessExpression) =>
  Array.contains(httpClientRequestNames, access.name.text)

export const callIsResponseBodyRead = (call: ts.CallExpression) => {
  const callee = unwrapTransparentExpression(call.expression)
  const propertyAccess = Option.liftPredicate(ts.isPropertyAccessExpression)(callee)

  return pipe(propertyAccess, Option.exists(propertyAccessIsResponseBody))
}

export const callIsHttpClientRequest = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
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

export const nodeClassifiesStatus =
  (checker: ts.TypeChecker) =>
  (node: ts.Node): boolean => {
    const isStatusClassify = callIsImportedApi(memberIsHttpNamespaceApi(httpStatusClassifyNames))(
      checker
    )

    const callExpressionIsStatusClassify = (call: ts.CallExpression) =>
      isStatusClassify(call.expression)

    return pipe(
      Match.value(node),
      Match.when(ts.isCallExpression, callExpressionIsStatusClassify),
      Match.when(ts.isPropertyAccessExpression, propertyAccessIsStatus),
      Match.when(ts.isBinaryExpression, binaryAccessesStatus),
      Match.when(ts.isIfStatement, ifStatementAccessesStatus),
      Match.when(ts.isConditionalExpression, conditionalAccessesStatus),
      Match.orElse(Function.constFalse)
    )
  }

const walkBodyStatus =
  (classify: (node: ts.Node) => boolean) =>
  (bodyRead: ts.CallExpression) =>
  (state: BodyStatusWalk, current: ts.Node): BodyStatusWalk => {
    if (state.sawBodyRead) {
      return state
    }

    if (strictEqual(bodyRead)(current)) {
      return BodyStatusWalk.make({
        sawBodyRead: true,
        sawStatusBefore: state.sawStatusBefore
      })
    }

    if (classify(current)) {
      return BodyStatusWalk.make({
        sawBodyRead: false,
        sawStatusBefore: true
      })
    }

    return state
  }

export const bodyReadPrecedesStatus =
  (checker: ts.TypeChecker) => (bodyRead: ts.CallExpression) => (body: ts.ConciseBody) => {
    const classify = nodeClassifiesStatus(checker)
    const step = walkBodyStatus(classify)(bodyRead)

    const initial = BodyStatusWalk.make({
      sawBodyRead: false,
      sawStatusBefore: false
    })

    const result = foldAst(step)(body)(initial)
    const sawBodyRead = result.sawBodyRead
    const noStatusBefore = !result.sawStatusBefore
    const flags = Array.make(sawBodyRead, noStatusBefore)

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

export const nodeIsHttpRelatedCall = (checker: ts.TypeChecker) => (current: ts.Node) => {
  const asCall = callExpressionOf(current)

  return Option.exists(asCall, callLooksHttpRelated(checker))
}

export const isBodyDecodeCall = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const bodyRead = callIsResponseBodyRead(call)
  const schemaDecode = callIsSchemaDecode(checker)(call)
  const httpSchema = callIsHttpResponseSchema(checker)(call)
  const flags = Array.make(bodyRead, schemaDecode, httpSchema)

  return Array.some(flags, Boolean)
}
