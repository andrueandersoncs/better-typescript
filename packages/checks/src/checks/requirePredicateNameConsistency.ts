import { Array, Function, HashSet, Option, pipe } from "effect"
import { makeDetection } from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import {
  callableSemantics,
  functionDefinitionKinds,
  isFunctionDefinition,
  type CallableSemantics
} from "./support/callableSemantics.js"
import type { FunctionDefinition } from "./support/tsNode.js"

const predicateOperations = HashSet.make(
  "can",
  "contain",
  "contains",
  "does",
  "equal",
  "equals",
  "every",
  "exist",
  "exists",
  "has",
  "include",
  "includes",
  "is",
  "should",
  "some"
)

const withDirectionOperations = HashSet.make("ends", "starts")

const incompatibleOperations = HashSet.make(
  "build",
  "construct",
  "create",
  "decode",
  "delete",
  "deserialize",
  "encode",
  "find",
  "format",
  "get",
  "load",
  "lookup",
  "make",
  "parse",
  "publish",
  "read",
  "remove",
  "resolve",
  "save",
  "select",
  "send",
  "serialize",
  "set",
  "transform",
  "update",
  "write"
)

const bareVariantConstructors = HashSet.make("none", "some")

const ambiguousStandalonePredicates = HashSet.make("every", "match", "matches", "some")

const emptyDetections: ReadonlyArray<Detection> = Array.empty()
const constantEmptyDetections = Function.constant(emptyDetections)

const hasWithDirectionPredicate = (words: ReadonlyArray<string>) => {
  const first = pipe(words, Array.head, Option.getOrElse(Function.constant("")))
  const second = words[1]
  const isDirection = HashSet.has(withDirectionOperations, first)
  const isWith = second === "with"
  const checks = Array.make(isDirection, isWith)

  return Array.every(checks, Boolean)
}

const claimsPredicate = (semantics: CallableSemantics) => {
  const words = semantics.name.words
  const first = pipe(words, Array.head, Option.getOrElse(Function.constant("")))
  const predicatePrefix = HashSet.has(predicateOperations, first)
  const singleWord = words.length === 1
  const isAmbiguousStandalone = HashSet.has(ambiguousStandalonePredicates, first)
  const standaloneAmbiguousChecks = Array.make(singleWord, isAmbiguousStandalone)
  const standaloneAmbiguous = Array.every(standaloneAmbiguousChecks, Boolean)
  const nonAmbiguousPrefix = !standaloneAmbiguous
  const prefixClaimChecks = Array.make(predicatePrefix, nonAmbiguousPrefix)
  const prefixClaim = Array.every(prefixClaimChecks, Boolean)
  const hasWithDirection = hasWithDirectionPredicate(words)
  const claims = Array.make(prefixClaim, hasWithDirection)

  return Array.some(claims, Boolean)
}

const isBareVariantConstructor = (semantics: CallableSemantics) => {
  const words = semantics.name.words
  const singleWord = words.length === 1
  const headWord = Array.head(words)
  const isVariant = Option.exists(headWord, (word) => HashSet.has(bareVariantConstructors, word))
  const checks = Array.make(singleWord, isVariant)

  return Array.every(checks, Boolean)
}

const incompatibleOperation = (semantics: CallableSemantics) =>
  pipe(
    semantics.name.operation,
    Option.filter((operation) => HashSet.has(incompatibleOperations, operation))
  )

const nonBooleanPredicateDetection =
  (match: ReturnType<typeof makeDetection>) => (semantics: CallableSemantics) =>
    match({
      node: semantics.node,
      message: `${semantics.name.text} claims a predicate, but its result shape is ${semantics.result.shape}.`,
      hint:
        "Rename the function so its operation matches the non-boolean result, or return a " +
        "boolean or type-predicate result."
    })

const booleanIncompatibleDetection =
  (match: ReturnType<typeof makeDetection>) =>
  (semantics: CallableSemantics) =>
  (operation: string) =>
    match({
      node: semantics.node,
      message: `${semantics.name.text} returns boolean, but claims the ${operation} operation.`,
      hint:
        "Rename with predicate vocabulary such as is, has, can, should, does, equal, " +
        "contain, include, match, exist, every, some, startsWith, or endsWith."
    })

const predicateNameMatches = (context: CheckContext) => {
  const match = makeDetection(context)
  const semanticsFor = callableSemantics(context)
  const nonBooleanDetection = nonBooleanPredicateDetection(match)
  const booleanIncompatible = booleanIncompatibleDetection(match)

  const matches = (definition: FunctionDefinition): ReadonlyArray<Detection> =>
    pipe(
      semanticsFor(definition),
      Option.map((semantics) => {
        const predicateClaim = claimsPredicate(semantics)
        const booleanResult = semantics.result.shape === "boolean"
        const bareVariant = isBareVariantConstructor(semantics)
        const nonBoolean = !booleanResult
        const nonBareVariant = !bareVariant
        const nonBooleanPredicateChecks = Array.make(predicateClaim, nonBoolean, nonBareVariant)
        const nonBooleanPredicateClaim = Array.every(nonBooleanPredicateChecks, Boolean)
        const nonPredicateClaim = !predicateClaim
        const booleanIncompatibleChecks = Array.make(booleanResult, nonPredicateClaim)
        const booleanIncompatibleClaim = Array.every(booleanIncompatibleChecks, Boolean)

        const nonBooleanPredicate = pipe(
          Option.liftPredicate((value: boolean) => value)(nonBooleanPredicateClaim),
          Option.map(() => nonBooleanDetection(semantics))
        )

        const booleanIncompatibleDetectionOption = pipe(
          Option.liftPredicate((value: boolean) => value)(booleanIncompatibleClaim),
          Option.flatMap(() => incompatibleOperation(semantics)),
          Option.map(booleanIncompatible(semantics))
        )

        return pipe(
          Array.make(nonBooleanPredicate, booleanIncompatibleDetectionOption),
          Array.flatMap(Option.toArray)
        )
      }),
      Option.getOrElse(constantEmptyDetections)
    )

  return matches
}

export const requirePredicateNameConsistency = makeCheck(
  "require-predicate-name-consistency",
  functionDefinitionKinds,
  isFunctionDefinition,
  predicateNameMatches
)
