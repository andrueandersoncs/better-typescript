import { Array, Function, HashSet, Option, pipe } from "effect"
import type { CallableSemantics } from "../support/callableSemanticsClass.js"
import { strictEqual } from "../equivalence.js"

export const predicateOperations = HashSet.make(
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

export const withDirectionOperations = HashSet.make("ends", "starts")

export const ambiguousStandalonePredicates = HashSet.make("every", "match", "matches", "some")

export const hasWithDirectionPredicate = (words: ReadonlyArray<string>) => {
  const first = pipe(words, Array.head, Option.getOrElse(Function.constant("")))
  const second = Array.get(words, 1)
  const isDirection = HashSet.has(withDirectionOperations, first)
  const isWith = Option.contains(second, "with")
  const checks = Array.make(isDirection, isWith)

  return Array.every(checks, Boolean)
}

export const claimsPredicate = (semantics: CallableSemantics) => {
  const first = pipe(semantics.name.words, Array.head, Option.getOrElse(Function.constant("")))
  const predicatePrefix = HashSet.has(predicateOperations, first)
  const singleWord = strictEqual(1)(semantics.name.words.length)
  const isAmbiguousStandalone = HashSet.has(ambiguousStandalonePredicates, first)
  const standaloneAmbiguousChecks = Array.make(singleWord, isAmbiguousStandalone)
  const standaloneAmbiguous = Array.every(standaloneAmbiguousChecks, Boolean)
  const nonAmbiguousPrefix = !standaloneAmbiguous
  const prefixClaimChecks = Array.make(predicatePrefix, nonAmbiguousPrefix)
  const prefixClaim = Array.every(prefixClaimChecks, Boolean)
  const hasWithDirection = hasWithDirectionPredicate(semantics.name.words)
  const claims = Array.make(prefixClaim, hasWithDirection)

  return Array.some(claims, Boolean)
}
