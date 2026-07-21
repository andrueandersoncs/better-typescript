import { Function, Match as EffectMatch, Option, pipe } from "effect"
import { oneFinding } from "@better-typescript/core/engine/policy"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { defineBuiltinPolicy } from "../definePolicy.js"
import {
  preferHashSetMatcher,
  type PreferHashSetFact
} from "@better-typescript/matchers/builtins/preferHashSet"

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

const preferHashSetFindings = (match: Match<PreferHashSetFact>) => {
  const constructorFindings = () =>
    oneFinding(match.target, constructorMessage, constructorHint, undefined)

  const mutableFindings = () =>
    oneFinding(match.target, mutableHashSetMessage, mutableHashSetHint, undefined)

  const typeRefFindings = (fact: PreferHashSetFact) => {
    const name = pipe(Option.fromNullishOr(fact.typeName), Option.getOrElse(emptyTypeNameFallback))

    return oneFinding(match.target, `Avoid the built-in ${name} type.`, typeRefHint, undefined)
  }

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "constructor" }, constructorFindings),
    EffectMatch.when({ kind: "mutable" }, mutableFindings),
    EffectMatch.when({ kind: "type-ref" }, typeRefFindings),
    EffectMatch.exhaustive
  )
}

export const preferHashSet = defineBuiltinPolicy(
  "prefer-hash-set",
  preferHashSetMatcher,
  Function.constant(preferHashSetFindings)
)
