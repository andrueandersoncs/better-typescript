import { Array, Function, HashSet, Option, pipe } from "effect"
import { functionDefinitionScanner } from "./functionDefinitionScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { Match } from "../scanner/match.js"
import type { MatchContext } from "../scanner/matchContext.js"
import { callableSemantics } from "../support/callableSemantics.js"
import type { CallableSemantics } from "../support/callableSemanticsClass.js"
import type { FunctionDefinition } from "../support/functionDefinition.js"
import { strictEqual } from "../equivalence.js"
import { RequirePredicateNameConsistencyFact } from "./requirePredicateNameConsistencyFact.js"
import { claimsPredicate } from "./predicateOperations.js"

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

const emptyFacts: ReadonlyArray<Match<RequirePredicateNameConsistencyFact>> = Array.empty()
const constantEmptyFacts = Function.constant(emptyFacts)

const isBareVariantConstructor = (semantics: CallableSemantics) => {
  const singleWord = strictEqual(1)(semantics.name.words.length)
  const headWord = Array.head(semantics.name.words)
  const isBareVariantWord = (word: string) => HashSet.has(bareVariantConstructors, word)
  const isVariant = Option.exists(headWord, isBareVariantWord)
  const checks = Array.make(singleWord, isVariant)

  return Array.every(checks, Boolean)
}

const isIncompatibleOperation = (operation: string) =>
  HashSet.has(incompatibleOperations, operation)

const incompatibleOperation = (semantics: CallableSemantics) =>
  pipe(semantics.name.operation, Option.filter(isIncompatibleOperation))

const nonBooleanPredicateFinding = (semantics: CallableSemantics) =>
  Option.gen(function* () {
    const predicateClaim = claimsPredicate(semantics)
    const booleanResult = strictEqual("boolean")(semantics.result.shape)
    const bareVariant = isBareVariantConstructor(semantics)
    const nonBoolean = !booleanResult
    const nonBareVariant = !bareVariant
    const nonBooleanPredicateChecks = Array.make(predicateClaim, nonBoolean, nonBareVariant)
    const nonBooleanPredicateClaim = Array.every(nonBooleanPredicateChecks, Boolean)
    yield* Option.liftPredicate(Boolean)(nonBooleanPredicateClaim)

    const fact = RequirePredicateNameConsistencyFact.make({
      kind: "non-boolean-predicate",
      nameText: semantics.name.text,
      shape: semantics.result.shape
    })

    return makeNodeMatch(semantics.node, fact)
  })

const booleanIncompatibleFinding = (semantics: CallableSemantics) =>
  Option.gen(function* () {
    const predicateClaim = claimsPredicate(semantics)
    const booleanResult = strictEqual("boolean")(semantics.result.shape)
    const nonPredicateClaim = !predicateClaim
    const booleanIncompatibleChecks = Array.make(booleanResult, nonPredicateClaim)
    const booleanIncompatibleClaim = Array.every(booleanIncompatibleChecks, Boolean)
    yield* Option.liftPredicate(Boolean)(booleanIncompatibleClaim)
    const operation = yield* incompatibleOperation(semantics)

    const fact = RequirePredicateNameConsistencyFact.make({
      kind: "boolean-incompatible",
      nameText: semantics.name.text,
      operation
    })

    return makeNodeMatch(semantics.node, fact)
  })

const matchesForSemantics = (semantics: CallableSemantics) => {
  const nonBooleanFinding = nonBooleanPredicateFinding(semantics)
  const incompatibleFinding = booleanIncompatibleFinding(semantics)
  const nonBooleanMatches = Option.toArray(nonBooleanFinding)
  const incompatibleMatches = Option.toArray(incompatibleFinding)

  return pipe(nonBooleanMatches, Array.appendAll(incompatibleMatches))
}

const matches = (context: MatchContext) => {
  const semanticsFor = callableSemantics(context)

  const matchesDefinition = (
    scan: FunctionDefinition
  ): ReadonlyArray<Match<RequirePredicateNameConsistencyFact>> =>
    pipe(semanticsFor(scan), Option.map(matchesForSemantics), Option.getOrElse(constantEmptyFacts))

  return matchesDefinition
}

export const requirePredicateNameConsistencyScanner = functionDefinitionScanner(matches)
