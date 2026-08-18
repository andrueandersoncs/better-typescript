import { noFirstPartySchemaDeclareScanner } from "../builtins/noFirstPartySchemaDeclare.js"
import { noInstanceofScanner } from "../builtins/noInstanceof.js"
import { noManualTypeDispatchScanner } from "../builtins/noManualTypeDispatch.js"
import { noMonomorphicStructGetScanner } from "../builtins/noMonomorphicStructGet.js"
import { noRawObjectTypesScanner } from "../builtins/noRawObjectTypes.js"
import { preferCurriedDataLastFunctionsScanner } from "../builtins/preferCurriedDataLastFunctions.js"
import { preferHashMapScanner } from "../builtins/preferHashMap.js"
import { preferHashSetScanner } from "../builtins/preferHashSet.js"
import { preferOptionMatchScanner } from "../builtins/preferOptionMatch.js"
import { preferPipeFunctionScanner } from "../builtins/preferPipeFunction.js"
import { Array, Function, pipe, Match as EffectMatch, Option } from "effect"
import { makeRuleMessage } from "../rule/makeRuleMessage.js"
import type { Rule } from "@better-typescript/core/linter"
import type { Match } from "../scanner/match.js"
import type { Scanner } from "../scanner/scannerData.js"
import { makeRule } from "../rule/makeRule.js"

import { fixedRuleMessage } from "../rule/fixedRuleMessage.js"

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
    match: Match<typeof preferHashMapScanner extends Scanner<infer Fact> ? Fact : never>
  ) => {
    const makeConstructorFindings = () => makeRuleMessage(constructorMessage, constructorHint)
    const makeMutableFindings = () => makeRuleMessage(mutableHashMapMessage, mutableHashMapHint)

    const makeTypeRefFindings = (
      fact: typeof preferHashMapScanner extends Scanner<infer Fact> ? Fact : never
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

  const preferHashMap = makeRule("prefer-hash-map")(preferHashMapScanner)(
    Function.constant(makePreferHashMapFindings)
  )

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

export const hashCollectionRules: ReadonlyArray<Rule> = Array.make(preferHashSet, preferHashMap)

const makePreferCurriedDataLastFunctions = () => {
  const message = "Avoid rest parameters and multiple runtime parameters in one function."

  const hint =
    "Curry runtime parameters into unary functions so configuration comes first and the primary data value is supplied last."

  const preferCurriedDataLastFunctions = makeRule("prefer-curried-data-last-functions")(
    preferCurriedDataLastFunctionsScanner
  )(fixedRuleMessage(message, hint))

  return preferCurriedDataLastFunctions
}

export const preferCurriedDataLastFunctions = makePreferCurriedDataLastFunctions()

const makePreferOptionMatch = () => {
  const message = "Avoid using Option.isSome/isNone in a ternary to unwrap an Option."

  const hint =
    "Use Option.match(option, { onNone: () => fallback, onSome: (value) => ... }) " +
    "instead of manually checking and accessing .value."

  const preferOptionMatch = makeRule("prefer-option-match")(preferOptionMatchScanner)(
    fixedRuleMessage(message, hint)
  )

  return preferOptionMatch
}

export const preferOptionMatch = makePreferOptionMatch()

const makePreferPipeRule = () => {
  const message = "Avoid calling .pipe() as a method."

  const hint =
    'Import pipe from "effect" and call it as a standalone function: ' +
    "pipe(value, fn1, fn2) instead of value.pipe(fn1, fn2)."

  const preferPipeFunction = makeRule("prefer-pipe-function")(preferPipeFunctionScanner)(
    fixedRuleMessage(message, hint)
  )

  return preferPipeFunction
}

export const preferPipeFunction = makePreferPipeRule()

export const pipelineRules: ReadonlyArray<Rule> = Array.make(
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
    match: Match<typeof noFirstPartySchemaDeclareScanner extends Scanner<infer Fact> ? Fact : never>
  ) =>
    makeRuleMessage(
      `Avoid Schema.declare for the first-party structural type "${match.fact.typeName}".`,
      schemaDeclareHint
    )

  const noFirstPartySchemaDeclare = makeRule("no-first-party-schema-declare")(
    noFirstPartySchemaDeclareScanner
  )(Function.constant(makeNoFirstPartySchemaDeclareFindings))

  return noFirstPartySchemaDeclare
}

export const noFirstPartySchemaDeclare = makeNoFirstPartySchemaDeclare()

const makeNoInstanceof = () => {
  const hint =
    "Use a stable discriminant, an explicit structural type guard, or Schema.is with a " +
    "structurally defined Schema such as Schema.Struct. Schema.is on Schema.Class retains " +
    "constructor semantics, so it does not make a class check structural or cross-realm safe."

  const makeNoInstanceofFindings = (
    match: Match<typeof noInstanceofScanner extends Scanner<infer Fact> ? Fact : never>
  ) =>
    makeRuleMessage(`Avoid instanceof for the first-party class "${match.fact.className}".`, hint)

  const noInstanceof = makeRule("no-instanceof")(noInstanceofScanner)(
    Function.constant(makeNoInstanceofFindings)
  )

  return noInstanceof
}

export const noInstanceof = makeNoInstanceof()

const makeNoManualTypeDispatch = () => {
  const message = "Avoid dispatching on a value with a chain of if statements that each return."

  const hint =
    "This is a hand-rolled pattern match. Use Effect's Match module — Match.value(subject) " +
    "with a Match.when(...) per case — and prefer Match.exhaustive so a new case is a compile " +
    "error rather than a silent fall-through."

  const noManualTypeDispatch = makeRule("no-manual-type-dispatch")(noManualTypeDispatchScanner)(
    fixedRuleMessage(message, hint)
  )

  return noManualTypeDispatch
}

export const noManualTypeDispatch = makeNoManualTypeDispatch()

const makeNoMonomorphicStructGet = () => {
  const message = "Avoid monomorphizing Struct.get at its declaration."

  const hint =
    "Keep Struct.get polymorphic. Inline it at a typed consumer, or put the " +
    "domain type on the consuming value or result rather than on the getter."

  const noMonomorphicStructGet = makeRule("no-monomorphic-struct-get")(
    noMonomorphicStructGetScanner
  )(fixedRuleMessage(message, hint))

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
    match: Match<typeof noRawObjectTypesScanner extends Scanner<infer Fact> ? Fact : never>
  ) => {
    const makeParameterFindings = () => makeRuleMessage(parameterMessage, parameterHint)
    const makeReturnFindings = () => makeRuleMessage(returnMessage, returnHint)

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "parameter" }, makeParameterFindings),
      EffectMatch.when({ kind: "return" }, makeReturnFindings),
      EffectMatch.exhaustive
    )
  }

  const noRawObjectTypes = makeRule("no-raw-object-types")(noRawObjectTypesScanner)(
    Function.constant(makeNoRawObjectTypesFindings)
  )

  return noRawObjectTypes
}

export const noRawObjectTypes = makeNoRawObjectTypes()

export const structuralDispatchRules: ReadonlyArray<Rule> = Array.make(
  noManualTypeDispatch,
  noMonomorphicStructGet,
  noRawObjectTypes,
  noFirstPartySchemaDeclare,
  noInstanceof
)

export const dispatchAndCollectionRules: ReadonlyArray<Rule> = pipe(
  structuralDispatchRules,
  Array.appendAll(hashCollectionRules),
  Array.appendAll(pipelineRules)
)
