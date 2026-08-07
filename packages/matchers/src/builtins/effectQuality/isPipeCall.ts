import { Array, Option, pipe } from "effect"

import * as ts from "typescript"

import { unwrapCallee } from "../../support/unwrapCallee.js"

import { importedEffectApiAt } from "../functionalCoreEffect/importedEffectApiAt.js"

import { identifierTextIsPipe } from "./identifierTextIsPipe.js"

const pipeNames = Array.of("pipe")

export const isPipeCall = (checker: ts.TypeChecker) => (call: ts.CallExpression) => {
  const callee = unwrapCallee(call.expression)
  const fromEffect = importedEffectApiAt(checker, callee, "Function", pipeNames)

  const pipeIdentifier = pipe(
    Option.liftPredicate(ts.isIdentifier)(callee),
    Option.exists(identifierTextIsPipe)
  )

  const flags = Array.make(fromEffect, pipeIdentifier)

  return Array.some(flags, Boolean)
}
