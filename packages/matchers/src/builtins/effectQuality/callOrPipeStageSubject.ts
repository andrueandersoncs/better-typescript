import { Array, flow, Function, Option, pipe, Struct } from "effect"

import * as ts from "typescript"

import { strictEqual } from "@better-typescript/matchers/equivalence"

import { callExpressionOf } from "../../support/callExpressionOf.js"

import { effectApiCall } from "./effectApiCall.js"

import { effectApiReference } from "./effectApiReference.js"

import { isPipeCall } from "./isPipeCall.js"

import { isExpressionReferenceNode } from "./isExpressionReferenceNode.js"

const stagesContainExpression =
  (expression: ts.Expression) => (stages: ReadonlyArray<ts.Expression>) =>
    Array.some(stages, strictEqual(expression))

const pipeParentContainsStage =
  (checker: ts.TypeChecker) => (expression: ts.Expression) => (parent: ts.Node) =>
    pipe(
      Option.liftPredicate(ts.isCallExpression)(parent),
      Option.filter(isPipeCall(checker)),
      Option.map(flow(Struct.get("arguments"), Array.fromIterable)),
      Option.exists(stagesContainExpression(expression))
    )

const expressionIsPipeStage = (checker: ts.TypeChecker) => (expression: ts.Expression) =>
  pipe(
    Option.fromNullishOr(expression.parent),
    Option.exists(pipeParentContainsStage(checker)(expression))
  )

export const callOrPipeStageSubject =
  (checker: ts.TypeChecker) =>
  (namespace: string) =>
  (names: ReadonlyArray<string>) =>
  (node: ts.Node): Option.Option<ts.Node> => {
    const matchesCall = effectApiCall(checker)(namespace)(names)
    const matchesReference = effectApiReference(checker)(namespace)(names)

    const asCall = pipe(
      callExpressionOf(node),
      Option.filter(matchesCall),
      Option.map((call) => call as ts.Node)
    )

    const asReference = pipe(
      Option.liftPredicate(isExpressionReferenceNode)(node),
      Option.filter(matchesReference),
      Option.filter(expressionIsPipeStage(checker)),
      Option.map((expression) => expression as ts.Node)
    )

    return pipe(asCall, Option.orElse(Function.constant(asReference)))
  }
