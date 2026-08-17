import { Array, pipe } from "effect"
import type { Guidance } from "@better-typescript/core/engine/policy/guidance"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import type { Policy } from "@better-typescript/core/engine/policy/policyClass"
import { controlFlowMatcherCatalog } from "@better-typescript/matchers/builtins/controlFlowMatcherCatalog"
import type { Match } from "@better-typescript/matchers/matcher/match"
import type { Matcher } from "@better-typescript/matchers/matcher/matcherData"
import { makeBuiltinPolicy } from "../makeBuiltinPolicy.js"
import { factGuidance } from "../policyGuidance.js"

const makeNoArraySpread = () => {
  const message = "Avoid the array-spread operator when constructing arrays."

  const hint =
    "Use Effect's Array module instead: Array.append or Array.prepend to add a " +
    "single element, Array.appendAll or Array.prependAll to combine two arrays, " +
    "and Array.fromIterable to materialize an iterable."

  const noArraySpread = makeBuiltinPolicy({
    name: "no-array-spread",
    matcher: controlFlowMatcherCatalog.noArraySpreadMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noArraySpread
}

export const noArraySpread = makeNoArraySpread()

const makeNoPrimitiveArrayConstructors = () => {
  const message = "Avoid primitive Array constructors."

  const hint =
    "Use Effect's Array module instead — Array.empty() for an empty array, " +
    "Array.of(value) or Array.make(...) for elements, Array.allocate(n) for a " +
    "fixed length, and Array.fromIterable for an iterable."

  const noPrimitiveArrayConstructors = makeBuiltinPolicy({
    name: "no-primitive-array-constructors",
    matcher: controlFlowMatcherCatalog.noPrimitiveArrayConstructorsMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noPrimitiveArrayConstructors
}

export const noPrimitiveArrayConstructors = makeNoPrimitiveArrayConstructors()

export const arrayConstructionPolicies: ReadonlyArray<Policy> = Array.make(
  noArraySpread,
  noPrimitiveArrayConstructors
)

const makeNoCallbacks = () => {
  const message = "Avoid callback-style functions that accept a function argument and return void."

  const hint =
    "Use Effect instead: wrap third-party callback APIs in an Effect, or declare your " +
    "own API as an Effect-returning function from the start. Ambient declarations " +
    "(declare statements) describing a third-party API are permitted."

  const noCallbacks = makeBuiltinPolicy({
    name: "no-callbacks",
    matcher: controlFlowMatcherCatalog.noCallbacksMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noCallbacks
}

export const noCallbacks = makeNoCallbacks()

const makeNoAsyncFunctions = () => {
  const message = "Avoid declaring functions as async."

  const hint =
    "Model asynchronous work with Effect instead of async/await. To integrate with a " +
    "third-party library: wrap incoming promises with Effect.tryPromise; satisfy an " +
    "outgoing Promise-returning callback contract with a non-async function that " +
    "returns Effect.runPromise(effect)."

  const noAsyncFunctions = makeBuiltinPolicy({
    name: "no-async-functions",
    matcher: controlFlowMatcherCatalog.noAsyncFunctionsMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noAsyncFunctions
}

export const noAsyncFunctions = makeNoAsyncFunctions()

export const asynchronousFunctionPolicies: ReadonlyArray<Policy> = Array.make(
  noCallbacks,
  noAsyncFunctions
)

const makeNoSwitchStatements = () => {
  const message = "Avoid switch statements."

  const hint =
    "Use Effect's Match module for pattern matching, and prefer Match.exhaustive " +
    "so every case is handled explicitly."

  const noSwitchStatements = makeBuiltinPolicy({
    name: "no-switch-statements",
    matcher: controlFlowMatcherCatalog.noSwitchStatementsMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noSwitchStatements
}

export const noSwitchStatements = makeNoSwitchStatements()

const makeNoFunctionKeyword = () => {
  const message = "Avoid using the function keyword."

  const hint =
    "Declare this function as a const using fat-arrow syntax instead. Keep function " +
    "declarations only when overload signatures are required, and keep function* when " +
    "generator semantics are required."

  const noFunctionKeyword = makeBuiltinPolicy({
    name: "no-function-keyword",
    matcher: controlFlowMatcherCatalog.noFunctionKeywordMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noFunctionKeyword
}

export const noFunctionKeyword = makeNoFunctionKeyword()

const makeNoInlineClosures = () => {
  const message =
    "Avoid arrow functions outside naming, currying, and third-party callback positions."

  const hint =
    "Name this function as a top-level const and pass it by reference, currying it when it " +
    "needs values from the enclosing scope. Inline arrows are permitted only as arguments " +
    "to third-party functions (effect combinators, node_modules callbacks). When the " +
    "expression sequences several steps, prefer a generator (Option.gen or Effect.gen) " +
    "over nesting functions."

  const noInlineClosures = makeBuiltinPolicy({
    name: "no-inline-closures",
    matcher: controlFlowMatcherCatalog.noInlineClosuresMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noInlineClosures
}

export const noInlineClosures = makeNoInlineClosures()

const makeNoNestedCalls = () => {
  const ruleHint =
    "A call whose result feeds another call hides a sequence of steps in one expression " +
    "that reads inside-out. Declare the inner result as a const (or a yield* step in a " +
    "gen block) and pass the name, or restructure data-last so the value flows through " +
    "pipe. Calls that return functions stay inline: currying and pipe stages read " +
    "left-to-right."

  const noNestedCallsGuidance: Guidance<
    typeof controlFlowMatcherCatalog.noNestedCallsMatcher extends Matcher<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<
        typeof controlFlowMatcherCatalog.noNestedCallsMatcher extends Matcher<infer Fact>
          ? Fact
          : never
      >
    ) =>
      makeFindings(
        match.target,
        `Avoid computing ${match.fact.callText} inline in the arguments of ${match.fact.consumerText}.`,
        ruleHint,
        match.fact
      )

  const noNestedCalls = makeBuiltinPolicy({
    name: "no-nested-calls",
    matcher: controlFlowMatcherCatalog.noNestedCallsMatcher,
    guidance: noNestedCallsGuidance,
    reported: true,
    stage: "program"
  })

  return noNestedCalls
}

export const noNestedCalls = makeNoNestedCalls()

export const declarativeControlPolicies: ReadonlyArray<Policy> = Array.make(
  noSwitchStatements,
  noFunctionKeyword,
  noInlineClosures,
  noNestedCalls
)

const makeNoForInLoops = () => {
  const message = "Avoid imperative logic in for..in loops."

  const hint =
    "Use Effect's Record module, such as Record.map(), Record.reduce(), " +
    "or Record.toEntries(), instead."

  const noForInLoops = makeBuiltinPolicy({
    name: "no-for-in-loops",
    matcher: controlFlowMatcherCatalog.noForInLoopsMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noForInLoops
}

export const noForInLoops = makeNoForInLoops()

const makeNoForLoops = () => {
  const message = "Avoid imperative logic in iterator-based for loops."

  const hint =
    "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
    "Array.filter(), or Array.flatMap(), instead."

  const noForLoops = makeBuiltinPolicy({
    name: "no-for-loops",
    matcher: controlFlowMatcherCatalog.noForLoopsMatcher,
    guidance: factGuidance(message, hint),
    reported: true,
    stage: "program"
  })

  return noForLoops
}

export const noForLoops = makeNoForLoops()

const makeNoForOfLoops = () => {
  const synchronousHint =
    "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
    "Array.filter(), or Array.flatMap(), instead."

  const asynchronousHint =
    "Use Stream.fromAsyncIterable(...).pipe(Stream.map(...), Stream.runCollect) or another " +
    "Stream/Effect combinator instead; Array combinators do not consume AsyncIterable values."

  const noForOfLoopsGuidance: Guidance<
    typeof controlFlowMatcherCatalog.noForOfLoopsMatcher extends Matcher<infer Fact> ? Fact : never
  > =
    () =>
    (
      match: Match<
        typeof controlFlowMatcherCatalog.noForOfLoopsMatcher extends Matcher<infer Fact>
          ? Fact
          : never
      >
    ) =>
      makeFindings(
        match.target,
        "Avoid imperative logic in for..of loops.",
        match.fact.isAsync ? asynchronousHint : synchronousHint,
        match.fact
      )

  const noForOfLoops = makeBuiltinPolicy({
    name: "no-for-of-loops",
    matcher: controlFlowMatcherCatalog.noForOfLoopsMatcher,
    guidance: noForOfLoopsGuidance,
    reported: true,
    stage: "program"
  })

  return noForOfLoops
}

export const noForOfLoops = makeNoForOfLoops()

export const imperativeLoopPolicies: ReadonlyArray<Policy> = Array.make(
  noForInLoops,
  noForLoops,
  noForOfLoops
)

// Member order is pinned because concatenated categories define the public report block order.
export const controlFlowPolicies: ReadonlyArray<Policy> = pipe(
  Array.make(
    asynchronousFunctionPolicies,
    arrayConstructionPolicies,
    imperativeLoopPolicies,
    declarativeControlPolicies
  ),
  Array.flatten
)
