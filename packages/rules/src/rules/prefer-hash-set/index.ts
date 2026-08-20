import { preferHashSetScanner } from "./preferHashSet.js"

import { Function, pipe, Match as EffectMatch, Option } from "effect"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makePreferHashSet = () => {
  const constructorMessage = "Avoid constructing a built-in Set."

  const constructorHint =
    "Use Effect's HashSet instead — for example HashSet.fromIterable([1, 2, 3]) or " +
    "HashSet.empty(). HashSet uses Equal and Hash with structural equality by default. For " +
    "reference-identity object members, wrap each value in an Equal.equal value that compares " +
    "the underlying objects with === and returns Hash.random(object) from Hash.symbol. " +
    "Constructing a Set is permitted only when it is handed to a third-party API that requires one."

  const typeRefHint =
    "Use HashSet.HashSet<T> from Effect instead. HashSet uses Equal and Hash with structural " +
    "equality by default. For reference-identity object members, use an Equal.equal wrapper whose " +
    "equality compares the underlying objects with === and whose Hash.symbol method returns " +
    "Hash.random(object). Writing the built-in Set type is permitted only where it mirrors a " +
    "third-party contract: ambient declarations and values that cross into a third-party call."

  const mutableHashSetMessage = "Avoid Effect's MutableHashSet."

  const mutableHashSetHint =
    "Use Effect's immutable HashSet instead. Build a HashSet with HashSet.empty(), " +
    "HashSet.make(), or HashSet.fromIterable(), and return the value from HashSet.add() " +
    "when updating it."

  const emptyTypeName = ""
  const emptyTypeNameFallback = Function.constant(emptyTypeName)

  const makePreferHashSetFindings = (
    match: Match<typeof preferHashSetScanner extends Scanner<infer Fact> ? Fact : never>
  ) => {
    const makeConstructorFindings = () => makeRuleMessage(constructorMessage, constructorHint)
    const makeMutableFindings = () => makeRuleMessage(mutableHashSetMessage, mutableHashSetHint)

    const makeTypeRefFindings = (
      fact: typeof preferHashSetScanner extends Scanner<infer Fact> ? Fact : never
    ) => {
      const name = pipe(
        Option.fromNullishOr(fact.typeName),
        Option.getOrElse(emptyTypeNameFallback)
      )

      return makeRuleMessage(`Avoid the built-in ${name} type.`, typeRefHint)
    }

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "constructor" }, makeConstructorFindings),
      EffectMatch.when({ kind: "mutable" }, makeMutableFindings),
      EffectMatch.when({ kind: "type-ref" }, makeTypeRefFindings),
      EffectMatch.exhaustive
    )
  }

  const preferHashSet = makeRule("prefer-hash-set")(preferHashSetScanner)(
    Function.constant(makePreferHashSetFindings)
  )

  return preferHashSet
}

export const preferHashSet = makePreferHashSet()
