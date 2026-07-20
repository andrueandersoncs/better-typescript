import { Array, Function, Option, Result, Struct, flow, pipe } from "effect"
import * as ts from "typescript"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import {
  callExpressionOf,
  isFunctionInitializer,
  unwrapTransparentExpression
} from "../support/tsNode.js"
import { roleForSourceFile, type EffectQualityIndex } from "./index.js"
import { isTestRole } from "./architectureRoles.js"
import { emptyRuleFindings, makeRuleFinding } from "./makeFindings.js"
import { callIsPlainIt } from "./reportedHttpTestIt.js"
import { callbackStaticallyReturnsEffect } from "./reportedHttpTestEffect.js"

const testStyleFinding = makeRuleFinding("effect-test-style")

const sourceHasTestRole = (index: EffectQualityIndex) => (sourceFile: ts.SourceFile) =>
  pipe(roleForSourceFile(index, sourceFile), Option.exists(isTestRole))

const callArguments = Struct.get<ts.CallExpression, "arguments">("arguments")

const functionInitializerOf = (argument: ts.Expression) => {
  const current = unwrapTransparentExpression(argument)

  return isFunctionInitializer(current) ? Result.succeed(current) : Result.failVoid
}

const filterFunctionInitializers = (args: ReadonlyArray<ts.Expression>) =>
  Array.filterMap(args, functionInitializerOf)

const testCallbackArgument = flow(callArguments, filterFunctionInitializers, Array.last)

const findingsForPlainEffectIt = flow(testStyleFinding("it"), Array.of)

export const effectTestStyleFindings =
  (context: CheckContext) => (index: EffectQualityIndex) => (node: ts.Node) => {
    const testSource = sourceHasTestRole(index)(context.sourceFile)

    if (!testSource) {
      return emptyRuleFindings
    }

    const isPlainIt = callIsPlainIt(context.checker)
    const returnsEffect = callbackStaticallyReturnsEffect(context.checker)

    const findingsWhenCallbackReturnsEffect = (call: ts.CallExpression) =>
      pipe(
        testCallbackArgument(call),
        Option.filter(returnsEffect),
        Option.map(() => findingsForPlainEffectIt(call))
      )

    return pipe(
      callExpressionOf(node),
      Option.filter(isPlainIt),
      Option.flatMap(findingsWhenCallbackReturnsEffect),
      Option.getOrElse(Function.constant(emptyRuleFindings))
    )
  }
