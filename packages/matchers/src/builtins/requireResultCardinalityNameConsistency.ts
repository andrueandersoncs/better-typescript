import { Array, flow, Function, HashSet, Match, Option, pipe, Schema } from "effect"
import { nodeMatcher } from "../matcher/matcher.js"
import { nodeMatch, type Match as NodeMatch } from "../matcher/data.js"
import {
  callableSemantics,
  callableExpectedResultWords,
  functionDefinitionKinds,
  wordsMatch,
  type CallableSemantics,
  type ResultCardinality
} from "../support/callableSemantics.js"
import { isFunctionDefinition, type FunctionDefinition } from "../support/tsNode.js"
import { strictEqual } from "../equivalence.js"

const pluralForOneKind = Schema.Literal("plural-for-one")
const singularForManyKind = Schema.Literal("singular-for-many")

const cardinalityValues = Array.make<["keyed", "many", "one", "optional-one", "unknown"]>(
  "keyed",
  "many",
  "one",
  "optional-one",
  "unknown"
)

// ResultCardinalityLiteral enumerates result cardinality because facts quote the observed class.
const ResultCardinalityLiteral = Schema.Literals(cardinalityValues)

// RequireResultCardinalityPluralForOneFact is plural-for-one evidence because nouns must match.
export const RequireResultCardinalityPluralForOneFact = Schema.Struct({
  kind: pluralForOneKind,
  nameText: Schema.String,
  claimed: Schema.String,
  singular: Schema.String,
  cardinality: ResultCardinalityLiteral
})

export interface RequireResultCardinalityPluralForOneFact extends Schema.Schema.Type<
  typeof RequireResultCardinalityPluralForOneFact
> {}

// RequireResultCardinalitySingularForManyFact is singular-for-many evidence because nouns match.
export const RequireResultCardinalitySingularForManyFact = Schema.Struct({
  kind: singularForManyKind,
  nameText: Schema.String,
  claimed: Schema.String,
  plural: Schema.String,
  cardinality: ResultCardinalityLiteral
})

export interface RequireResultCardinalitySingularForManyFact extends Schema.Schema.Type<
  typeof RequireResultCardinalitySingularForManyFact
> {}

const cardinalityFactMembers = Array.make(
  RequireResultCardinalityPluralForOneFact,
  RequireResultCardinalitySingularForManyFact
)

// RequireResultCardinalityNameConsistencyFact unions claims because plural and singular differ.
export const RequireResultCardinalityNameConsistencyFact = Schema.Union(cardinalityFactMembers)

export type RequireResultCardinalityNameConsistencyFact = Schema.Schema.Type<
  typeof RequireResultCardinalityNameConsistencyFact
>

const neutralCardinalityWords = HashSet.make(
  "advice",
  "config",
  "data",
  "evidence",
  "metadata",
  "news",
  "series",
  "species",
  "status"
)

const irregularPluralWords = HashSet.make("children", "people")

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

const ambiguousEndingSuffixes = Array.make("ss", "us", "is", "ics")
const esStemSuffixes = Array.make("ses", "xes", "zes", "ches", "shes")
const esPluralEndings = Array.make("s", "x", "z", "ch", "sh")
const yVowels = Array.make("a", "e", "i", "o", "u")

const endsWithSuffix = (word: string) => (suffix: string) => word.endsWith(suffix)

const hasAmbiguousEnding = (word: string) =>
  Array.some(ambiguousEndingSuffixes, endsWithSuffix(word))

const longerThan = (minimum: number) => (word: string) => word.length > minimum

const hasPluralSuffix = (suffix: string, minimumLength: number) => (word: string) => {
  const endingMatches = endsWithSuffix(word)(suffix)
  const lengthMatches = longerThan(minimumLength)(word)
  const checks = Array.make(endingMatches, lengthMatches)

  return Array.every(checks, Boolean)
}

const iesPluralSuffix = hasPluralSuffix("ies", 3)
const esPluralSuffix = hasPluralSuffix("es", 2)
const sPluralSuffix = hasPluralSuffix("s", 1)
const ySuffix = hasPluralSuffix("y", 1)

const isRegularPlural = (word: string) => {
  const ambiguous = hasAmbiguousEnding(word)
  const iesPlural = iesPluralSuffix(word)
  const esPlural = esPluralSuffix(word)
  const sPlural = sPluralSuffix(word)
  const suffixSignals = Array.make(iesPlural, esPlural, sPlural)
  const suffixPlural = Array.some(suffixSignals, Boolean)
  const checks = Array.make(!ambiguous, suffixPlural)

  return Array.every(checks, Boolean)
}

const isConfidentlyPlural = (word: string) => {
  const neutral = HashSet.has(neutralCardinalityWords, word)
  const irregular = HashSet.has(irregularPluralWords, word)
  const regular = isRegularPlural(word)
  const pluralSignals = Array.make(irregular, regular)
  const plural = Array.some(pluralSignals, Boolean)
  const checks = Array.make(!neutral, plural)

  return Array.every(checks, Boolean)
}

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

const dropSuffix = (count: number) => (word: string) => word.slice(0, -count)
const dropThree = dropSuffix(3)
const dropTwo = dropSuffix(2)
const dropOne = dropSuffix(1)

const hasEsStemSuffix = (word: string) => Array.some(esStemSuffixes, endsWithSuffix(word))

const iesToY = (word: string) => `${dropThree(word)}y`

const keepWord = (word: string) => word

const singularize = (word: string) => {
  const matched = pipe(
    Match.value(word),
    Match.when(isChildren, Function.constant("child")),
    Match.when(isPeople, Function.constant("person")),
    Match.when(iesPluralSuffix, iesToY),
    Match.when(hasEsStemSuffix, dropTwo),
    Match.when(sPluralSuffix, dropOne),
    Match.orElse(keepWord)
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
    Match.value(word),
    Match.when(isChild, Function.constant("children")),
    Match.when(isPerson, Function.constant("people")),
    Match.when(ySuffix, pluralizeYEnding),
    Match.when(needsEsPlural, appendEs),
    Match.orElse(appendS)
  )

  return matched
}

const isObjectShape = strictEqual("object")

const expectsSingularCardinality = (cardinality: ResultCardinality) =>
  Array.contains(singularCardinalityValues, cardinality)

const expectsPluralCardinality = (cardinality: ResultCardinality) =>
  Array.contains(pluralCardinalityValues, cardinality)

const pluralForOneFinding = (semantics: CallableSemantics, claimed: string) => {
  const cardinality = semantics.result.cardinality
  const expectsSingular = expectsSingularCardinality(cardinality)
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
        cardinality
      })

      return nodeMatch(semantics.node, fact)
    })
  )
}

const singularForManyFinding = (semantics: CallableSemantics, claimed: string) => {
  const cardinality = semantics.result.cardinality
  const expectsPlural = expectsPluralCardinality(cardinality)
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
        cardinality
      })

      return nodeMatch(semantics.node, fact)
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
  ): ReadonlyArray<NodeMatch<RequireResultCardinalityNameConsistencyFact>> =>
    pipe(semanticsFor(definition), Option.flatMap(findingForSemantics), Option.toArray)

const matches = flow(callableSemantics, matchesDefinition)

export const requireResultCardinalityNameConsistencyMatcher =
  nodeMatcher(functionDefinitionKinds)(isFunctionDefinition)(matches)
