import { Function, Match as EffectMatch, Option, pipe } from "effect"
import { makeFindings } from "@better-typescript/core/engine/policy"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { makeBuiltinPolicy } from "../definePolicy.js"
import {
  preferHashMapMatcher,
  type PreferHashMapFact
} from "@better-typescript/matchers/builtins/preferHashMap"

const constructorMessage = "Avoid constructing a built-in Map."

const constructorHint =
  'Use Effect\'s HashMap instead — for example HashMap.fromIterable([["a", 1]]) or ' +
  "HashMap.empty(). HashMap uses Equal and Hash with structural equality by default. For " +
  "reference-identity object keys, wrap each key in an Equal.equal value that compares the " +
  "underlying objects with === and returns Hash.random(object) from Hash.symbol. Constructing " +
  "a Map is permitted only when it is handed to a third-party API that requires one."

const typeRefHint =
  "Use HashMap.HashMap<K, V> from Effect instead. HashMap uses Equal and Hash with structural " +
  "equality by default. For reference-identity object keys, use an Equal.equal wrapper whose " +
  "equality compares the underlying objects with === and whose Hash.symbol method returns " +
  "Hash.random(object). Writing the built-in Map type is permitted only where it mirrors a " +
  "third-party contract: ambient declarations and values that cross into a third-party call."

const mutableHashMapMessage = "Avoid Effect's MutableHashMap."

const mutableHashMapHint =
  "Use Effect's immutable HashMap instead. Build a HashMap with HashMap.empty(), " +
  "HashMap.make(), or HashMap.fromIterable(), and return the value from HashMap.set() " +
  "when updating it."

const emptyTypeName = ""
const emptyTypeNameFallback = Function.constant(emptyTypeName)

const makePreferHashMapFindings = (match: Match<PreferHashMapFact>) => {
  const makeConstructorFindings = () =>
    makeFindings(match.target, constructorMessage, constructorHint, undefined)

  const makeMutableFindings = () =>
    makeFindings(match.target, mutableHashMapMessage, mutableHashMapHint, undefined)

  const makeTypeRefFindings = (fact: PreferHashMapFact) => {
    const name = pipe(Option.fromNullishOr(fact.typeName), Option.getOrElse(emptyTypeNameFallback))

    return makeFindings(match.target, `Avoid the built-in ${name} type.`, typeRefHint, undefined)
  }

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "constructor" }, makeConstructorFindings),
    EffectMatch.when({ kind: "mutable" }, makeMutableFindings),
    EffectMatch.when({ kind: "type-ref" }, makeTypeRefFindings),
    EffectMatch.exhaustive
  )
}

export const preferHashMap = makeBuiltinPolicy(
  "prefer-hash-map",
  preferHashMapMatcher,
  Function.constant(makePreferHashMapFindings)
)
