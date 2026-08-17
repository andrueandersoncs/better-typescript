import { Array, Function, pipe, Match as EffectMatch, Option } from "effect"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import { dataModelMatcherCatalog } from "@better-typescript/matchers/builtins/dataModelMatcherCatalog"
import type { Match } from "@better-typescript/matchers/matcher/match"
import type { Matcher } from "@better-typescript/matchers/matcher/matcherData"
import { makeBuiltinPolicy } from "../makeBuiltinPolicy.js"

import { factGuidance } from "../policyGuidance.js"

const makePreferHashMap = () => {
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

  const makePreferHashMapFindings = (
    match: Match<
      typeof dataModelMatcherCatalog.preferHashMapMatcher extends Matcher<infer Fact> ? Fact : never
    >
  ) => {
    const makeConstructorFindings = () =>
      makeFindings(match.target, constructorMessage, constructorHint, undefined)

    const makeMutableFindings = () =>
      makeFindings(match.target, mutableHashMapMessage, mutableHashMapHint, undefined)

    const makeTypeRefFindings = (
      fact: typeof dataModelMatcherCatalog.preferHashMapMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    ) => {
      const name = pipe(
        Option.fromNullishOr(fact.typeName),
        Option.getOrElse(emptyTypeNameFallback)
      )

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

  const preferHashMap = makeBuiltinPolicy({
    name: "prefer-hash-map",
    matcher: dataModelMatcherCatalog.preferHashMapMatcher,
    guidance: Function.constant(makePreferHashMapFindings),
    reported: true,
    stage: "program"
  })

  return preferHashMap
}

export const preferHashMap = makePreferHashMap()

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
    match: Match<
      typeof dataModelMatcherCatalog.preferHashSetMatcher extends Matcher<infer Fact> ? Fact : never
    >
  ) => {
    const makeConstructorFindings = () =>
      makeFindings(match.target, constructorMessage, constructorHint, undefined)

    const makeMutableFindings = () =>
      makeFindings(match.target, mutableHashSetMessage, mutableHashSetHint, undefined)

    const makeTypeRefFindings = (
      fact: typeof dataModelMatcherCatalog.preferHashSetMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    ) => {
      const name = pipe(
        Option.fromNullishOr(fact.typeName),
        Option.getOrElse(emptyTypeNameFallback)
      )

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

  const preferHashSet = makeBuiltinPolicy({
    name: "prefer-hash-set",
    matcher: dataModelMatcherCatalog.preferHashSetMatcher,
    guidance: Function.constant(makePreferHashSetFindings),
    reported: true,
    stage: "program"
  })

  return preferHashSet
}

export const preferHashSet = makePreferHashSet()

export const hashCollectionPolicies: ReadonlyArray<Policy> = Array.make(
  preferHashSet,
  preferHashMap
)

const makePreferCurriedDataLastFunctions = () => {
  const message = "Avoid rest parameters and multiple runtime parameters in one function."

  const hint =
    "Curry runtime parameters into unary functions so configuration comes first and the primary data value is supplied last."

  const preferCurriedDataLastFunctions = makeBuiltinPolicy({
    name: "prefer-curried-data-last-functions",
    matcher: dataModelMatcherCatalog.preferCurriedDataLastFunctionsMatcher,
    guidance: factGuidance(message, hint),
    reported: false,
    stage: "program"
  })

  return preferCurriedDataLastFunctions
}

export const preferCurriedDataLastFunctions = makePreferCurriedDataLastFunctions()

const makePreferOptionMatch = () => {
  const message = "Avoid using Option.isSome/isNone in a ternary to unwrap an Option."

  const hint =
    "Use Option.match(option, { onNone: () => fallback, onSome: (value) => ... }) " +
    "instead of manually checking and accessing .value."

  const preferOptionMatch = makeBuiltinPolicy({
    name: "prefer-option-match",
    matcher: dataModelMatcherCatalog.preferOptionMatchMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return preferOptionMatch
}

export const preferOptionMatch = makePreferOptionMatch()

const makePreferPipePolicy = () => {
  const message = "Avoid calling .pipe() as a method."

  const hint =
    'Import pipe from "effect" and call it as a standalone function: ' +
    "pipe(value, fn1, fn2) instead of value.pipe(fn1, fn2)."

  const preferPipeFunction = makeBuiltinPolicy({
    name: "prefer-pipe-function",
    matcher: dataModelMatcherCatalog.preferPipeFunctionMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return preferPipeFunction
}

export const preferPipeFunction = makePreferPipePolicy()

export const pipelinePolicies: ReadonlyArray<Policy> = Array.make(
  preferOptionMatch,
  preferPipeFunction,
  preferCurriedDataLastFunctions
)

const makeNoFirstPartySchemaDeclare = () => {
  const schemaDeclareHint =
    "Schema.declare is for third-party integrations and non-parametric opaque or branded types " +
    "validated by a type guard. For structural models you own, define a Schema.Struct plus a " +
    "same-named decoded interface — for example export const MyType = Schema.Struct({ ... }); " +
    "export interface MyType extends Schema.Schema.Type<typeof MyType> {} — which gives you " +
    "validation, encoding, and decoding for free."

  const makeNoFirstPartySchemaDeclareFindings = (
    match: Match<
      typeof dataModelMatcherCatalog.noFirstPartySchemaDeclareMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    >
  ) =>
    makeFindings(
      match.target,
      `Avoid Schema.declare for the first-party structural type "${match.fact.typeName}".`,
      schemaDeclareHint,
      undefined
    )

  const noFirstPartySchemaDeclare = makeBuiltinPolicy({
    name: "no-first-party-schema-declare",
    matcher: dataModelMatcherCatalog.noFirstPartySchemaDeclareMatcher,
    guidance: Function.constant(makeNoFirstPartySchemaDeclareFindings),
    reported: true,
    stage: "program"
  })

  return noFirstPartySchemaDeclare
}

export const noFirstPartySchemaDeclare = makeNoFirstPartySchemaDeclare()

const makeNoInstanceof = () => {
  const hint =
    "Use a stable discriminant, an explicit structural type guard, or Schema.is with a " +
    "structurally defined Schema such as Schema.Struct. Schema.is on Schema.Class retains " +
    "constructor semantics, so it does not make a class check structural or cross-realm safe."

  const makeNoInstanceofFindings = (
    match: Match<
      typeof dataModelMatcherCatalog.noInstanceofMatcher extends Matcher<infer Fact> ? Fact : never
    >
  ) =>
    makeFindings(
      match.target,
      `Avoid instanceof for the first-party class "${match.fact.className}".`,
      hint,
      undefined
    )

  const noInstanceof = makeBuiltinPolicy({
    name: "no-instanceof",
    matcher: dataModelMatcherCatalog.noInstanceofMatcher,
    guidance: Function.constant(makeNoInstanceofFindings),
    reported: true,
    stage: "program"
  })

  return noInstanceof
}

export const noInstanceof = makeNoInstanceof()

const makeNoManualTypeDispatch = () => {
  const message = "Avoid dispatching on a value with a chain of if statements that each return."

  const hint =
    "This is a hand-rolled pattern match. Use Effect's Match module — Match.value(subject) " +
    "with a Match.when(...) per case — and prefer Match.exhaustive so a new case is a compile " +
    "error rather than a silent fall-through."

  const noManualTypeDispatch = makeBuiltinPolicy({
    name: "no-manual-type-dispatch",
    matcher: dataModelMatcherCatalog.noManualTypeDispatchMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noManualTypeDispatch
}

export const noManualTypeDispatch = makeNoManualTypeDispatch()

const makeNoMonomorphicStructGet = () => {
  const message = "Avoid monomorphizing Struct.get at its declaration."

  const hint =
    "Keep Struct.get polymorphic. Inline it at a typed consumer, or put the " +
    "domain type on the consuming value or result rather than on the getter."

  const noMonomorphicStructGet = makeBuiltinPolicy({
    name: "no-monomorphic-struct-get",
    matcher: dataModelMatcherCatalog.noMonomorphicStructGetMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noMonomorphicStructGet
}

export const noMonomorphicStructGet = makeNoMonomorphicStructGet()

const makeNoRawObjectTypes = () => {
  const parameterMessage = "Parameter uses an anonymous object type instead of a named type."

  const parameterHint =
    "Reuse a named data structure that already expresses this value's semantics. " +
    "If none exists, reconsider whether this function is a real abstraction or a " +
    "procedural seam that should be collapsed into its owner. Introduce a new model " +
    "only when the data has meaning independent of this parameter list; never replace " +
    "it with another anonymous object type."

  const returnMessage = "Return type uses an anonymous object type instead of a named type."

  const returnHint =
    "Define a named type or interface that describes the data's domain meaning — " +
    "for example UserProfile instead of { name: string, age: number }. " +
    "Name the type after what the data represents, not its structural role " +
    "(avoid names like FooResult or BarResponse)."

  const makeNoRawObjectTypesFindings = (
    match: Match<
      typeof dataModelMatcherCatalog.noRawObjectTypesMatcher extends Matcher<infer Fact>
        ? Fact
        : never
    >
  ) => {
    const makeParameterFindings = () =>
      makeFindings(match.target, parameterMessage, parameterHint, undefined)

    const makeReturnFindings = () =>
      makeFindings(match.target, returnMessage, returnHint, undefined)

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "parameter" }, makeParameterFindings),
      EffectMatch.when({ kind: "return" }, makeReturnFindings),
      EffectMatch.exhaustive
    )
  }

  const noRawObjectTypes = makeBuiltinPolicy({
    name: "no-raw-object-types",
    matcher: dataModelMatcherCatalog.noRawObjectTypesMatcher,
    guidance: Function.constant(makeNoRawObjectTypesFindings),
    reported: true,
    stage: "program"
  })

  return noRawObjectTypes
}

export const noRawObjectTypes = makeNoRawObjectTypes()

export const structuralDispatchPolicies: ReadonlyArray<Policy> = Array.make(
  noManualTypeDispatch,
  noMonomorphicStructGet,
  noRawObjectTypes,
  noFirstPartySchemaDeclare,
  noInstanceof
)

// Member order is pinned because concatenated categories define the public report block order.
export const dispatchAndCollectionPolicies: ReadonlyArray<Policy> = pipe(
  structuralDispatchPolicies,
  Array.appendAll(hashCollectionPolicies),
  Array.appendAll(pipelinePolicies)
)
