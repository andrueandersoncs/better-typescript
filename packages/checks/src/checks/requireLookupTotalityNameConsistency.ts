import { Array, Function, HashSet, Option, pipe, Result, Tuple } from "effect"
import { makeDetection } from "@better-typescript/core/engine/check"
import type { CheckContext } from "@better-typescript/core/engine/check/data"
import type { Detection } from "@better-typescript/core/engine/location/data"

import { makeCheck } from "../defineCheck.js"
import {
  callableSemantics,
  functionDefinitionKinds,
  type CallableSemantics
} from "./support/callableSemantics.js"
import { isFunctionDefinition, type FunctionDefinition } from "./support/tsNode.js"
import { strictEqual } from "@better-typescript/core/engine/equivalence"

const optionalTotalityClaims = HashSet.make("find", "lookup", "maybe", "optional")
const totalTotalityClaims = HashSet.make("require", "unsafe")

const getOrThrowWords = Array.make("get", "or", "throw")
const getOrElseWords = Array.make("get", "or", "else")
const getOrThrowSequence = Tuple.make(getOrThrowWords, "getOrThrow")
const getOrElseSequence = Tuple.make(getOrElseWords, "getOrElse")
const totalTotalitySequences = Array.make(getOrThrowSequence, getOrElseSequence)

const emptyDetections: ReadonlyArray<Detection> = Array.empty()
const constantEmptyDetections = Function.constant(emptyDetections)

const startsWithWords =
  (words: ReadonlyArray<string>) =>
  (sequence: ReadonlyArray<string>): boolean => {
    const wordMatchesOffset = (word: string, offset: number) => {
      const candidate = Array.get(words, offset)

      return Option.contains(candidate, word)
    }

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
      startsWithClaimedWords(sequence),
      Option.liftPredicate((value: boolean) => value),
      Option.as(label),
      Result.fromOption(Function.constVoid)
    )

  return pipe(totalTotalitySequences, Array.filterMap(labelWhenPrefixMatches))
}

const formatClaims = (claims: ReadonlyArray<string>) => Array.join(claims, "/")

const optionalClaimContradiction =
  (match: ReturnType<typeof makeDetection>) => (semantics: CallableSemantics) => {
    const claims = claimedOptionalWords(semantics.name.words)
    const hasClaim = Array.isReadonlyArrayNonEmpty(claims)
    const returnsTotal = strictEqual(semantics.result.totality, "total")
    const conditions = Array.make(hasClaim, returnsTotal)
    const contradicts = Array.every(conditions, Boolean)
    const claimLabel = formatClaims(claims)
    const message = `${semantics.name.text} claims optional lookup via ${claimLabel}, but returns total data.`

    const hint =
      "Return optional or fallible data (Option, nullish, Result), or remove find/lookup/maybe/optional from the name."

    return pipe(
      Option.liftPredicate((value: boolean) => value)(contradicts),
      Option.map(() =>
        match({
          node: semantics.node,
          message,
          hint
        })
      )
    )
  }

const totalClaimContradiction =
  (match: ReturnType<typeof makeDetection>) => (semantics: CallableSemantics) => {
    const wordClaims = claimedTotalWords(semantics.name.words)
    const sequenceClaims = claimedTotalSequenceLabels(semantics.name.words)
    const claims = pipe(wordClaims, Array.appendAll(sequenceClaims), Array.dedupe)
    const hasClaim = Array.isReadonlyArrayNonEmpty(claims)
    const returnsOptional = strictEqual(semantics.result.totality, "optional")
    const conditions = Array.make(hasClaim, returnsOptional)
    const contradicts = Array.every(conditions, Boolean)
    const claimLabel = formatClaims(claims)
    const message = `${semantics.name.text} claims required access via ${claimLabel}, but returns optional data.`
    const hint = "Return total data, or remove require/unsafe/getOrThrow/getOrElse from the name."

    return pipe(
      Option.liftPredicate((value: boolean) => value)(contradicts),
      Option.map(() =>
        match({
          node: semantics.node,
          message,
          hint
        })
      )
    )
  }

const totalityNameMatches = (context: CheckContext) => {
  const match = makeDetection(context)
  const semanticsFor = callableSemantics(context)
  const optionalContradiction = optionalClaimContradiction(match)
  const totalContradiction = totalClaimContradiction(match)

  const matches = (definition: FunctionDefinition): ReadonlyArray<Detection> =>
    pipe(
      semanticsFor(definition),
      Option.filter((semantics) => semantics.result.totality !== "unknown"),
      Option.map((semantics) => {
        const optionalFinding = optionalContradiction(semantics)
        const totalFinding = totalContradiction(semantics)
        const findings = Array.make(optionalFinding, totalFinding)

        return Array.flatMap(findings, Option.toArray)
      }),
      Option.getOrElse(constantEmptyDetections)
    )

  return matches
}

export const requireLookupTotalityNameConsistency = makeCheck(
  "require-lookup-totality-name-consistency",
  functionDefinitionKinds,
  isFunctionDefinition,
  totalityNameMatches
)
