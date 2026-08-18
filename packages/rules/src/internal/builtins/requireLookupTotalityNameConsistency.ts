import { Array, Function, HashSet, Option, Result, Tuple, pipe } from "effect"
import { functionDefinitionScanner } from "./functionDefinitionScanner.js"
import { makeNodeMatch } from "../scanner/makeNodeMatch.js"
import type { Match } from "../scanner/match.js"
import type { MatchContext } from "../scanner/matchContext.js"
import { callableSemantics } from "../support/callableSemantics.js"
import type { CallableSemantics } from "../support/callableSemanticsClass.js"
import type { FunctionDefinition } from "../support/functionDefinition.js"
import { strictEqual } from "../equivalence.js"
import { formatClaims } from "./formatClaims.js"
import { RequireLookupTotalityNameConsistencyFact } from "./requireLookupTotalityNameConsistencyFact.js"

const optionalTotalityClaims = HashSet.make("find", "lookup", "maybe", "optional")
const totalTotalityClaims = HashSet.make("require", "unsafe")

const getOrThrowWords = Array.make("get", "or", "throw")
const getOrElseWords = Array.make("get", "or", "else")
const getOrThrowSequence = Tuple.make(getOrThrowWords, "getOrThrow")
const getOrElseSequence = Tuple.make(getOrElseWords, "getOrElse")
const totalTotalitySequences = Array.make(getOrThrowSequence, getOrElseSequence)

const emptyFacts: ReadonlyArray<Match<RequireLookupTotalityNameConsistencyFact>> = Array.empty()
const constantEmptyFacts = Function.constant(emptyFacts)

const startsWithWords = (words: ReadonlyArray<string>) => (sequence: ReadonlyArray<string>) => {
  const wordMatchesOffset = (word: string, offset: number) =>
    pipe(Array.get(words, offset), Option.contains(word))

  return Array.every(sequence, wordMatchesOffset)
}

const isOptionalTotalityClaim = (word: string) => HashSet.has(optionalTotalityClaims, word)
const isTotalTotalityClaim = (word: string) => HashSet.has(totalTotalityClaims, word)

const claimedOptionalWords = (words: ReadonlyArray<string>): ReadonlyArray<string> =>
  pipe(words, Array.head, Option.filter(isOptionalTotalityClaim), Option.toArray)

const claimedTotalWords = (words: ReadonlyArray<string>): ReadonlyArray<string> =>
  pipe(words, Array.head, Option.filter(isTotalTotalityClaim), Option.toArray)

const claimedTotalSequenceLabels = (words: ReadonlyArray<string>): ReadonlyArray<string> => {
  const startsWithClaimedWords = startsWithWords(words)

  const labelWhenPrefixMatches = ([sequence, label]: readonly [ReadonlyArray<string>, string]) =>
    pipe(
      Option.liftPredicate(startsWithClaimedWords)(sequence),
      Option.as(label),
      Result.fromOption(Function.constVoid)
    )

  return pipe(totalTotalitySequences, Array.filterMap(labelWhenPrefixMatches))
}

const knownTotality = (semantics: CallableSemantics) =>
  !strictEqual("unknown")(semantics.result.totality)

const isTotalResult = (semantics: CallableSemantics) =>
  strictEqual("total")(semantics.result.totality)

const isOptionalResult = (semantics: CallableSemantics) =>
  strictEqual("optional")(semantics.result.totality)

const makeOptionalClaimFact = (claimLabel: string) => (nameText: string) =>
  RequireLookupTotalityNameConsistencyFact.make({
    kind: "optional-claim",
    nameText,
    claimLabel
  })

const makeTotalClaimFact = (claimLabel: string) => (nameText: string) =>
  RequireLookupTotalityNameConsistencyFact.make({
    kind: "total-claim",
    nameText,
    claimLabel
  })

const optionalClaimFinding = (semantics: CallableSemantics) =>
  Option.gen(function* () {
    const optionalClaims = claimedOptionalWords(semantics.name.words)
    yield* Option.liftPredicate(Array.isReadonlyArrayNonEmpty)(optionalClaims)
    yield* Option.liftPredicate(isTotalResult)(semantics)

    const claimLabel = formatClaims(optionalClaims)
    const fact = makeOptionalClaimFact(claimLabel)(semantics.name.text)

    return makeNodeMatch(semantics.node, fact)
  })

const totalClaimFinding = (semantics: CallableSemantics) =>
  Option.gen(function* () {
    const totalWordClaims = claimedTotalWords(semantics.name.words)
    const totalSequenceClaims = claimedTotalSequenceLabels(semantics.name.words)
    const totalClaims = pipe(totalWordClaims, Array.appendAll(totalSequenceClaims), Array.dedupe)
    yield* Option.liftPredicate(Array.isReadonlyArrayNonEmpty)(totalClaims)
    yield* Option.liftPredicate(isOptionalResult)(semantics)

    const claimLabel = formatClaims(totalClaims)
    const fact = makeTotalClaimFact(claimLabel)(semantics.name.text)

    return makeNodeMatch(semantics.node, fact)
  })

const matchesForSemantics = (semantics: CallableSemantics) => {
  const optionalFinding = optionalClaimFinding(semantics)
  const totalFinding = totalClaimFinding(semantics)
  const optionalMatches = Option.toArray(optionalFinding)
  const totalMatches = Option.toArray(totalFinding)

  return pipe(optionalMatches, Array.appendAll(totalMatches))
}

const matches = (context: MatchContext) => {
  const semanticsFor = callableSemantics(context)

  const matchesDefinition = (
    scan: FunctionDefinition
  ): ReadonlyArray<Match<RequireLookupTotalityNameConsistencyFact>> =>
    pipe(
      semanticsFor(scan),
      Option.filter(knownTotality),
      Option.map(matchesForSemantics),
      Option.getOrElse(constantEmptyFacts)
    )

  return matchesDefinition
}

export const requireLookupTotalityNameConsistencyScanner = functionDefinitionScanner(matches)
