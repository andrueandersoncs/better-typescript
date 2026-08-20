import { callExpressionKinds } from "../../internal/scanner/nodeKindSubscriptions.js"
import { Array, Function, Option, Struct, pipe } from "effect"

import * as ts from "typescript"

import { strictEqual } from "../../internal/equivalence.js"

import { fixedRuleMessage } from "../../internal/rule/fixedRuleMessage.js"

import { makeRule } from "../../internal/rule/makeRule.js"

import { makeNodeScanner } from "../../internal/scanner/makeNodeScanner.js"

import type { Match as ScannerMatch } from "../../internal/scanner/match.js"

import type { MatchContext } from "../../internal/scanner/matchContext.js"

import { enclosingFunctionLike } from "../../internal/support/effectApi/enclosingFunctionLike.js"

import { propertyNameText } from "../../internal/support/propertyNameText.js"

import { apiSubject } from "../../internal/builtins/effectQuality/apiSubject.js"

import { callIsEffectApi } from "../../internal/builtins/effectQuality/callIsEffectApi.js"

import { declarationNameText } from "./declarationNameText.js"

import { retryEffectNames } from "../../internal/builtins/effectQuality/retryEffectNames.js"

import {
  makeSubjectMatch,
  noSubjectMatches
} from "../../internal/builtins/effectQuality/subjectMatch.js"

const enclosingFunctionName = (node: ts.Node) =>
  pipe(
    enclosingFunctionLike(node),
    Option.flatMap((declaration) => {
      const direct = declarationNameText(declaration)

      if (Option.isSome(direct)) {
        return direct
      }

      return pipe(
        Option.fromNullishOr(declaration.parent),
        Option.flatMap((parent) => {
          const variableName = pipe(
            Option.some(parent),
            Option.filter(ts.isVariableDeclaration),
            Option.map(Struct.get("name")),
            Option.filter(ts.isIdentifier),
            Option.map(Struct.get("text"))
          )

          if (Option.isSome(variableName)) {
            return variableName
          }

          return pipe(
            Option.some(parent),
            Option.filter(ts.isPropertyAssignment),
            Option.map(Struct.get("name")),
            Option.flatMap(propertyNameText)
          )
        })
      )
    })
  )

const mutationOperationPattern =
  /^(create|insert|update|upsert|delete|remove|write|save|put|post|patch|send|publish|enqueue|dispatch|mutate)/i

const operationNameNear = (node: ts.Node) =>
  pipe(enclosingFunctionName(node), Option.getOrElse(Function.constant("")))

const isIdempotentOperationName = (operationName: string) =>
  /^(get|list|find|read|lookup|fetch|resolve|load|query|check)/i.test(operationName)

const idempotentRetryCandidates =
  (context: MatchContext) =>
  (node: ts.CallExpression): ReadonlyArray<ScannerMatch<string>> => {
    const notRetry = !callIsEffectApi(context.checker)("Effect")(retryEffectNames)(node)

    if (notRetry) {
      return noSubjectMatches
    }

    const operation = operationNameNear(node)
    const missingOperation = strictEqual(0)(operation.length)
    const alreadyIdempotent = isIdempotentOperationName(operation)
    const notMutation = !mutationOperationPattern.test(operation)
    const quiet = Array.make(missingOperation, alreadyIdempotent, notMutation)

    if (Array.some(quiet, Boolean)) {
      return noSubjectMatches
    }

    const api = apiSubject(context)("Effect.retry")(node.expression)
    const subject = `${api} (${operation})`
    const finding = makeSubjectMatch(subject)(node.expression)

    return Array.of(finding)
  }

const idempotentRetryScanner = makeNodeScanner(callExpressionKinds)(ts.isCallExpression)(
  idempotentRetryCandidates
)

export const idempotentRetry = makeRule("idempotent-retry")(idempotentRetryScanner)(
  fixedRuleMessage(
    "Retry only idempotent operations.",
    "Establish idempotency in the domain contract before applying retry."
  )
)
