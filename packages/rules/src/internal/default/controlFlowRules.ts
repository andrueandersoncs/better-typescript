import { noAsyncFunctionsScanner } from "../builtins/noAsyncFunctions.js"
import { noCallbacksScanner } from "../builtins/noCallbacks.js"
import { noForInLoopsScanner } from "../builtins/noForInLoops.js"
import { noForLoopsScanner } from "../builtins/noForLoops.js"
import { noForOfLoopsScanner } from "../builtins/noForOfLoops.js"
import { noNestedCallsScanner } from "../builtins/noNestedCalls.js"
import { noSwitchStatementsScanner } from "../builtins/noSwitchStatements.js"
import { Array, pipe } from "effect"
import type { RuleMessage } from "../rule/ruleMessage.js"
import { makeRuleMessage } from "../rule/makeRuleMessage.js"
import type { Rule } from "@better-typescript/core/linter"
import type { Match } from "../scanner/match.js"
import type { Scanner } from "../scanner/scannerData.js"
import { makeRule } from "../rule/makeRule.js"
import { fixedRuleMessage } from "../rule/fixedRuleMessage.js"
import { noFunctionKeyword } from "../direct/noFunctionKeyword.js"
import { noInlineClosures } from "../direct/noInlineClosures.js"

const makeNoCallbacks = () => {
  const message = "Avoid callback-style void APIs."
  const hint = "Return an Effect from the operation instead of accepting a callback."
  const noCallbacks = makeRule("no-callbacks")(noCallbacksScanner)(fixedRuleMessage(message, hint))

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

  const noAsyncFunctions = makeRule("no-async-functions")(noAsyncFunctionsScanner)(
    fixedRuleMessage(message, hint)
  )

  return noAsyncFunctions
}

export const noAsyncFunctions = makeNoAsyncFunctions()

export const asynchronousFunctionRules: ReadonlyArray<Rule> = Array.make(
  noCallbacks,
  noAsyncFunctions
)

const makeNoSwitchStatements = () => {
  const message = "Avoid switch statements."

  const hint =
    "Use Effect's Match module for pattern matching, and prefer Match.exhaustive " +
    "so every case is handled explicitly."

  const noSwitchStatements = makeRule("no-switch-statements")(noSwitchStatementsScanner)(
    fixedRuleMessage(message, hint)
  )

  return noSwitchStatements
}

export const noSwitchStatements = makeNoSwitchStatements()

const makeNoNestedCalls = () => {
  const ruleHint =
    "A call whose result feeds another call hides a sequence of steps in one expression " +
    "that reads inside-out. Declare the inner result as a const (or a yield* step in a " +
    "gen block) and pass the name, or restructure data-last so the value flows through " +
    "pipe. Calls that return functions stay inline: currying and pipe stages read " +
    "left-to-right."

  const makeNoNestedCallsRuleMessage: RuleMessage<
    typeof noNestedCallsScanner extends Scanner<infer Fact> ? Fact : never
  > =
    () => (match: Match<typeof noNestedCallsScanner extends Scanner<infer Fact> ? Fact : never>) =>
      makeRuleMessage(
        `Avoid computing ${match.fact.callText} inline in the arguments of ${match.fact.consumerText}.`,
        ruleHint
      )

  const noNestedCalls = makeRule("no-nested-calls")(noNestedCallsScanner)(
    makeNoNestedCallsRuleMessage
  )

  return noNestedCalls
}

export const noNestedCalls = makeNoNestedCalls()

export const declarativeControlRules: ReadonlyArray<Rule> = Array.make(
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

  const noForInLoops = makeRule("no-for-in-loops")(noForInLoopsScanner)(
    fixedRuleMessage(message, hint)
  )

  return noForInLoops
}

export const noForInLoops = makeNoForInLoops()

const makeNoForLoops = () => {
  const message = "Avoid imperative logic in iterator-based for loops."

  const hint =
    "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
    "Array.filter(), or Array.flatMap(), instead."

  const noForLoops = makeRule("no-for-loops")(noForLoopsScanner)(fixedRuleMessage(message, hint))

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

  const noForOfLoopsRuleMessage: RuleMessage<
    typeof noForOfLoopsScanner extends Scanner<infer Fact> ? Fact : never
  > = () => (match: Match<typeof noForOfLoopsScanner extends Scanner<infer Fact> ? Fact : never>) =>
    makeRuleMessage(
      "Avoid imperative logic in for..of loops.",
      match.fact.isAsync ? asynchronousHint : synchronousHint
    )

  const noForOfLoops = makeRule("no-for-of-loops")(noForOfLoopsScanner)(noForOfLoopsRuleMessage)

  return noForOfLoops
}

export const noForOfLoops = makeNoForOfLoops()

export const imperativeLoopRules: ReadonlyArray<Rule> = Array.make(
  noForInLoops,
  noForLoops,
  noForOfLoops
)

export const controlFlowRules: ReadonlyArray<Rule> = pipe(
  Array.make(asynchronousFunctionRules, imperativeLoopRules, declarativeControlRules),
  Array.flatten
)
