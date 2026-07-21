import { Array, Function, HashSet, Option, pipe, Schema } from "effect"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch, type Match, type MatchContext } from "../matcher/data.js"
import {
  callableSemantics,
  functionDefinitionKinds,
  type CallableSemantics
} from "../support/callableSemantics.js"
import { isFunctionDefinition, type FunctionDefinition } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"

const nonBooleanPredicateKind = Schema.Literal("non-boolean-predicate")
const booleanIncompatibleKind = Schema.Literal("boolean-incompatible")

// RequirePredicateNonBooleanFact is non-boolean predicate evidence because name and shape pair.
export const RequirePredicateNonBooleanFact = Schema.Struct({
  kind: nonBooleanPredicateKind,
  nameText: Schema.String,
  shape: Schema.String
})

export interface RequirePredicateNonBooleanFact extends Schema.Schema.Type<
  typeof RequirePredicateNonBooleanFact
> {}

// RequirePredicateBooleanIncompatibleFact is incompatible evidence because verbs must match.
export const RequirePredicateBooleanIncompatibleFact = Schema.Struct({
  kind: booleanIncompatibleKind,
  nameText: Schema.String,
  operation: Schema.String
})

export interface RequirePredicateBooleanIncompatibleFact extends Schema.Schema.Type<
  typeof RequirePredicateBooleanIncompatibleFact
> {}

const predicateFactMembers = Array.make(
  RequirePredicateNonBooleanFact,
  RequirePredicateBooleanIncompatibleFact
)

// RequirePredicateNameConsistencyFact unions claims because non-boolean and incompatible differ.
export const RequirePredicateNameConsistencyFact = Schema.Union(predicateFactMembers)

export type RequirePredicateNameConsistencyFact = Schema.Schema.Type<
  typeof RequirePredicateNameConsistencyFact
>

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

const emptyFacts: ReadonlyArray<Match<RequirePredicateNameConsistencyFact>> = Array.empty()
const constantEmptyFacts = Function.constant(emptyFacts)

const hasWithDirectionPredicate = (words: ReadonlyArray<string>) => {
  const first = pipe(words, Array.head, Option.getOrElse(Function.constant("")))
  const second = Array.get(words, 1)
  const isDirection = HashSet.has(withDirectionOperations, first)
  const isWith = Option.contains(second, "with")
  const checks = Array.make(isDirection, isWith)

  return Array.every(checks, Boolean)
}

const claimsPredicate = (semantics: CallableSemantics) => {
  const words = semantics.name.words
  const first = pipe(words, Array.head, Option.getOrElse(Function.constant("")))
  const predicatePrefix = HashSet.has(predicateOperations, first)
  const singleWord = strictEqual(1)(words.length)
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
  const singleWord = strictEqual(1)(words.length)
  const headWord = Array.head(words)
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

    return nodeMatch(semantics.node, fact)
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

    return nodeMatch(semantics.node, fact)
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
    definition: FunctionDefinition
  ): ReadonlyArray<Match<RequirePredicateNameConsistencyFact>> =>
    pipe(
      semanticsFor(definition),
      Option.map(matchesForSemantics),
      Option.getOrElse(constantEmptyFacts)
    )

  return matchesDefinition
}

export const requirePredicateNameConsistencyMatcher =
  nodeMatcher(functionDefinitionKinds)(isFunctionDefinition)(matches)
