import { Array, Function, HashSet, Match, Option, pipe } from "effect"
import { makeDetection } from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import {
  callableSemantics,
  callableExpectedResultWords,
  functionDefinitionKinds,
  isFunctionDefinition,
  wordsMatch,
  type CallableSemantics,
  type ResultCardinality
} from "./support/callableSemantics.js"
import type { FunctionDefinition } from "./support/tsNode.js"

const resultCardinality = (value: ResultCardinality) => value

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

const oneCardinality = resultCardinality("one")
const optionalOneCardinality = resultCardinality("optional-one")
const manyCardinality = resultCardinality("many")
const keyedCardinality = resultCardinality("keyed")

const singularCardinality: ReadonlyArray<ResultCardinality> = Array.make(
  oneCardinality,
  optionalOneCardinality
)

const pluralCardinality: ReadonlyArray<ResultCardinality> = Array.make(
  manyCardinality,
  keyedCardinality
)

const noneDetection: Option.Option<Detection> = Option.none()
const constantNoneDetection = Function.constant(noneDetection)

const claimedResult = (semantics: CallableSemantics) => semantics.name.result

const agreesWithResultConcept = (claimed: string) => (semantics: CallableSemantics) => {
  const expectedWords = callableExpectedResultWords(semantics)
  const matchesClaimed = wordsMatch(claimed)

  return Array.some(expectedWords, matchesClaimed)
}

const hasAmbiguousEnding = (word: string) => {
  const endsWithSs = word.endsWith("ss")
  const endsWithUs = word.endsWith("us")
  const endsWithIs = word.endsWith("is")
  const endsWithIcs = word.endsWith("ics")
  const endings = Array.make(endsWithSs, endsWithUs, endsWithIs, endsWithIcs)

  return Array.some(endings, Boolean)
}

const isConfidentlyPlural = (word: string) => {
  const neutral = HashSet.has(neutralCardinalityWords, word)
  const irregular = HashSet.has(irregularPluralWords, word)
  const ambiguous = hasAmbiguousEnding(word)
  const iesEnding = word.endsWith("ies")
  const iesLength = word.length > 3
  const iesChecks = Array.make(iesEnding, iesLength)
  const iesPlural = Array.every(iesChecks, Boolean)
  const esEnding = word.endsWith("es")
  const esLength = word.length > 2
  const esChecks = Array.make(esEnding, esLength)
  const esPlural = Array.every(esChecks, Boolean)
  const sEnding = word.endsWith("s")
  const sLength = word.length > 1
  const sChecks = Array.make(sEnding, sLength)
  const sPlural = Array.every(sChecks, Boolean)
  const suffixChecks = Array.make(iesPlural, esPlural, sPlural)
  const suffixPlural = Array.some(suffixChecks, Boolean)
  const regularPluralChecks = Array.make(!ambiguous, suffixPlural)
  const regularPlural = Array.every(regularPluralChecks, Boolean)
  const pluralSignals = Array.make(irregular, regularPlural)
  const plural = Array.some(pluralSignals, Boolean)
  const confidentChecks = Array.make(!neutral, plural)

  return Array.every(confidentChecks, Boolean)
}

const isConfidentlySingular = (word: string) => {
  const neutral = HashSet.has(neutralCardinalityWords, word)
  const irregularPlural = HashSet.has(irregularPluralWords, word)
  const ambiguous = hasAmbiguousEnding(word)
  const plural = isConfidentlyPlural(word)
  const blocked = Array.make(neutral, irregularPlural, ambiguous, plural)

  return !Array.some(blocked, Boolean)
}

const singularize = (word: string) => {
  if (word === "children") {
    return "child"
  }

  if (word === "people") {
    return "person"
  }

  const iesEnding = word.endsWith("ies")
  const iesLength = word.length > 3
  const iesChecks = Array.make(iesEnding, iesLength)
  const iesPlural = Array.every(iesChecks, Boolean)

  if (iesPlural) {
    return `${word.slice(0, -3)}y`
  }

  const endsWithSes = word.endsWith("ses")
  const endsWithXes = word.endsWith("xes")
  const endsWithZes = word.endsWith("zes")
  const endsWithChes = word.endsWith("ches")
  const endsWithShes = word.endsWith("shes")

  const esStemEndings = Array.make(
    endsWithSes,
    endsWithXes,
    endsWithZes,
    endsWithChes,
    endsWithShes
  )

  if (Array.some(esStemEndings, Boolean)) {
    return word.slice(0, -2)
  }

  const sEnding = word.endsWith("s")
  const sLength = word.length > 1
  const sChecks = Array.make(sEnding, sLength)
  const sPlural = Array.every(sChecks, Boolean)

  return sPlural ? word.slice(0, -1) : word
}

const yVowels = Array.make("a", "e", "i", "o", "u")

const pluralize = (word: string) => {
  if (word === "child") {
    return "children"
  }

  if (word === "person") {
    return "people"
  }

  const yEnding = word.endsWith("y")
  const yLength = word.length > 1
  const yChecks = Array.make(yEnding, yLength)
  const endsWithY = Array.every(yChecks, Boolean)

  if (endsWithY) {
    const beforeY = word.slice(0, -1)
    const vowelBeforeY = Array.some(yVowels, (vowel) => beforeY.endsWith(vowel))

    return vowelBeforeY ? `${word}s` : `${beforeY}ies`
  }

  const endsWithS = word.endsWith("s")
  const endsWithX = word.endsWith("x")
  const endsWithZ = word.endsWith("z")
  const endsWithCh = word.endsWith("ch")
  const endsWithSh = word.endsWith("sh")
  const esEndings = Array.make(endsWithS, endsWithX, endsWithZ, endsWithCh, endsWithSh)

  return Array.some(esEndings, Boolean) ? `${word}es` : `${word}s`
}

const pluralNounForOneMessage =
  (match: ReturnType<typeof makeDetection>) =>
  (semantics: CallableSemantics) =>
  (claimed: string) => {
    const singular = singularize(claimed)
    const cardinality = semantics.result.cardinality
    const message = `${semantics.name.text} names its result as plural ${claimed}, but returns ${cardinality}.`
    const hint = `Rename the result noun to singular ${singular} so the name matches a single returned value.`

    return match({
      node: semantics.node,
      message,
      hint
    })
  }

const singularNounForManyMessage =
  (match: ReturnType<typeof makeDetection>) =>
  (semantics: CallableSemantics) =>
  (claimed: string) => {
    const plural = pluralize(claimed)
    const cardinality = semantics.result.cardinality
    const message = `${semantics.name.text} names its result as singular ${claimed}, but returns ${cardinality}.`
    const hint = `Rename the result noun to plural ${plural} so the name matches the collection result.`

    return match({
      node: semantics.node,
      message,
      hint
    })
  }

const cardinalityContradiction =
  (match: ReturnType<typeof makeDetection>) => (semantics: CallableSemantics) =>
    Option.gen(function* () {
      const claimed = yield* claimedResult(semantics)
      yield* Option.liftPredicate(agreesWithResultConcept(claimed))(semantics)

      const cardinality = semantics.result.cardinality
      const expectsSingular = Array.contains(singularCardinality, cardinality)
      const expectsPlural = Array.contains(pluralCardinality, cardinality)
      const namedObject = semantics.result.shape === "object"
      const pluralClaim = isConfidentlyPlural(claimed)
      const singularClaim = isConfidentlySingular(claimed)
      const singularPluralMismatch = Array.make(expectsSingular, pluralClaim, !namedObject)
      const pluralSingularMismatch = Array.make(expectsPlural, singularClaim)
      const reportPluralNoun = Array.every(singularPluralMismatch, Boolean)
      const reportSingularNoun = Array.every(pluralSingularMismatch, Boolean)
      const pluralNounDetection = pluralNounForOneMessage(match)(semantics)(claimed)
      const singularNounDetection = singularNounForManyMessage(match)(semantics)(claimed)
      const pluralNounFinding = Option.some(pluralNounDetection)
      const singularNounFinding = Option.some(singularNounDetection)

      return yield* pipe(
        Match.value(true),
        Match.when(Function.constant(reportPluralNoun), Function.constant(pluralNounFinding)),
        Match.when(Function.constant(reportSingularNoun), Function.constant(singularNounFinding)),
        Match.orElse(constantNoneDetection)
      )
    })

const resultCardinalityNameMatches = (context: CheckContext) => {
  const match = makeDetection(context)
  const semanticsFor = callableSemantics(context)
  const contradiction = cardinalityContradiction(match)

  const matches = (definition: FunctionDefinition): ReadonlyArray<Detection> =>
    pipe(semanticsFor(definition), Option.flatMap(contradiction), Option.toArray)

  return matches
}

export const requireResultCardinalityNameConsistency = makeCheck(
  "require-result-cardinality-name-consistency",
  functionDefinitionKinds,
  isFunctionDefinition,
  resultCardinalityNameMatches
)
