import { Array, Function, HashSet, Option, flow, pipe, Match as EffectMatch } from "effect"
import { functionDefinitionMatcher } from "./functionDefinitionMatcher.js"
import { makeNodeMatch } from "../matcher/makeNodeMatch.js"
import type { Match as NodeMatch } from "../matcher/match.js"
import { callableExpectedResultWords } from "../support/callableExpectedResultWords.js"
import { callableSemantics } from "../support/callableSemantics.js"
import type { CallableSemantics } from "../support/callableSemanticsClass.js"
import { wordsMatch } from "../support/hasEsPluralSuffix.js"
import type { ResultCardinality } from "../support/resultCardinality.js"
import type { FunctionDefinition } from "../support/functionDefinition.js"
import { strictEqual } from "../equivalence.js"
import { dropOne } from "./dropOne.js"
import { dropSuffix } from "./dropSuffix.js"
import { endsWithSuffix } from "./endsWithSuffix.js"
import { isConfidentlyPlural } from "./esPluralSuffix.js"
import { hasPluralSuffix } from "./hasPluralSuffix.js"
import { hasAmbiguousEnding } from "./hasAmbiguousEnding.js"
import { iesPluralSuffix } from "./iesPluralSuffix.js"
import { irregularPluralWords } from "./irregularPluralWords.js"
import { neutralCardinalityWords } from "./neutralCardinalityWords.js"
import {
  RequireResultCardinalityNameConsistencyFact,
  type RequireResultCardinalityNameConsistencyFact as RequireResultCardinalityNameConsistencyFactType
} from "./requireResultCardinalityNameConsistencyFact.js"
import { sPluralSuffix } from "./sPluralSuffix.js"

const oneCardinality: ResultCardinality = "one"
const optionalOneCardinality: ResultCardinality = "optional-one"
const manyCardinality: ResultCardinality = "many"
const keyedCardinality: ResultCardinality = "keyed"

const singularCardinalityValues: ReadonlyArray<ResultCardinality> = Array.make(
  oneCardinality,
  optionalOneCardinality
)

const pluralCardinalityValues: ReadonlyArray<ResultCardinality> = Array.make(
  manyCardinality,
  keyedCardinality
)

const claimedResult = (semantics: CallableSemantics) => semantics.name.result

const agreesWithResultConcept = (claimed: string) => (semantics: CallableSemantics) => {
  const expectedWords = callableExpectedResultWords(semantics)
  const matchesClaimed = wordsMatch(claimed)

  return Array.some(expectedWords, matchesClaimed)
}

const esStemSuffixes = Array.make("ses", "xes", "zes", "ches", "shes")
const esPluralEndings = Array.make("s", "x", "z", "ch", "sh")
const yVowels = Array.make("a", "e", "i", "o", "u")

const ySuffix = hasPluralSuffix("y", 1)

const isConfidentlySingular = (word: string) => {
  const neutral = HashSet.has(neutralCardinalityWords, word)
  const irregularPlural = HashSet.has(irregularPluralWords, word)
  const ambiguous = hasAmbiguousEnding(word)
  const plural = isConfidentlyPlural(word)
  const blocked = Array.make(neutral, irregularPlural, ambiguous, plural)

  return !Array.some(blocked, Boolean)
}

const isChildren = strictEqual("children")
const isPeople = strictEqual("people")
const isChild = strictEqual("child")
const isPerson = strictEqual("person")

const dropThree = dropSuffix(3)
const dropTwo = dropSuffix(2)

const hasEsStemSuffix = (word: string) => Array.some(esStemSuffixes, endsWithSuffix(word))

const iesToY = (word: string) => `${dropThree(word)}y`

const keepWord = (word: string) => word

const singularize = (word: string) => {
  const matched = pipe(
    EffectMatch.value(word),
    EffectMatch.when(isChildren, Function.constant("child")),
    EffectMatch.when(isPeople, Function.constant("person")),
    EffectMatch.when(iesPluralSuffix, iesToY),
    EffectMatch.when(hasEsStemSuffix, dropTwo),
    EffectMatch.when(sPluralSuffix, dropOne),
    EffectMatch.orElse(keepWord)
  )

  return matched
}

const endsWithVowel = (stem: string) => Array.some(yVowels, endsWithSuffix(stem))

const pluralizeYEnding = (word: string) => {
  const beforeY = dropOne(word)
  const vowelBeforeY = endsWithVowel(beforeY)
  const vowelForm = `${word}s`
  const consonantForm = `${beforeY}ies`

  return vowelBeforeY ? vowelForm : consonantForm
}

const needsEsPlural = (word: string) => Array.some(esPluralEndings, endsWithSuffix(word))

const appendEs = (word: string) => `${word}es`
const appendS = (word: string) => `${word}s`

const pluralize = (word: string) => {
  const matched = pipe(
    EffectMatch.value(word),
    EffectMatch.when(isChild, Function.constant("children")),
    EffectMatch.when(isPerson, Function.constant("people")),
    EffectMatch.when(ySuffix, pluralizeYEnding),
    EffectMatch.when(needsEsPlural, appendEs),
    EffectMatch.orElse(appendS)
  )

  return matched
}

const isObjectShape = strictEqual("object")

const expectsSingularCardinality = (cardinality: ResultCardinality) =>
  Array.contains(singularCardinalityValues, cardinality)

const expectsPluralCardinality = (cardinality: ResultCardinality) =>
  Array.contains(pluralCardinalityValues, cardinality)

const pluralForOneFinding = (semantics: CallableSemantics, claimed: string) => {
  const expectsSingular = expectsSingularCardinality(semantics.result.cardinality)
  const pluralClaim = isConfidentlyPlural(claimed)
  const namedObject = isObjectShape(semantics.result.shape)
  const mismatch = Array.make(expectsSingular, pluralClaim, !namedObject)
  const shouldReport = Array.every(mismatch, Boolean)

  return pipe(
    Option.liftPredicate(Boolean)(shouldReport),
    Option.map(() => {
      const singular = singularize(claimed)

      const fact = RequireResultCardinalityNameConsistencyFact.make({
        kind: "plural-for-one",
        nameText: semantics.name.text,
        claimed,
        singular,
        cardinality: semantics.result.cardinality
      })

      return makeNodeMatch(semantics.node, fact)
    })
  )
}

const singularForManyFinding = (semantics: CallableSemantics, claimed: string) => {
  const expectsPlural = expectsPluralCardinality(semantics.result.cardinality)
  const singularClaim = isConfidentlySingular(claimed)
  const mismatch = Array.make(expectsPlural, singularClaim)
  const shouldReport = Array.every(mismatch, Boolean)

  return pipe(
    Option.liftPredicate(Boolean)(shouldReport),
    Option.map(() => {
      const plural = pluralize(claimed)

      const fact = RequireResultCardinalityNameConsistencyFact.make({
        kind: "singular-for-many",
        nameText: semantics.name.text,
        claimed,
        plural,
        cardinality: semantics.result.cardinality
      })

      return makeNodeMatch(semantics.node, fact)
    })
  )
}

const findingForAgreedClaim = (semantics: CallableSemantics) => (claimed: string) => {
  const pluralFinding = pluralForOneFinding(semantics, claimed)
  const singularFinding = singularForManyFinding(semantics, claimed)

  return Option.orElse(pluralFinding, Function.constant(singularFinding))
}

const findingForClaimedResult = (semantics: CallableSemantics) => (claimed: string) =>
  pipe(
    Option.liftPredicate(agreesWithResultConcept(claimed))(semantics),
    Option.flatMap(() => findingForAgreedClaim(semantics)(claimed))
  )

const findingForSemantics = (semantics: CallableSemantics) =>
  pipe(claimedResult(semantics), Option.flatMap(findingForClaimedResult(semantics)))

const matchesDefinition =
  (semanticsFor: (definition: FunctionDefinition) => Option.Option<CallableSemantics>) =>
  (
    definition: FunctionDefinition
  ): ReadonlyArray<NodeMatch<RequireResultCardinalityNameConsistencyFactType>> =>
    pipe(semanticsFor(definition), Option.flatMap(findingForSemantics), Option.toArray)

const matches = flow(callableSemantics, matchesDefinition)

export const requireResultCardinalityNameConsistencyMatcher = functionDefinitionMatcher(matches)
