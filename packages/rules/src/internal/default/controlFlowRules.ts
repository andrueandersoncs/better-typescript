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

const noCallbacksMessage = "Avoid callback-style void APIs."
const noCallbacksHint = "Return an Effect from the operation instead of accepting a callback."

export const noCallbacks = makeRule("no-callbacks")(noCallbacksScanner)(
  fixedRuleMessage(noCallbacksMessage, noCallbacksHint)
)

const noAsyncFunctionsMessage = "Avoid declaring functions as async."

const noAsyncFunctionsHint =
  "Model asynchronous work with Effect instead of async/await. To integrate with a " +
  "third-party library: wrap incoming promises with Effect.tryPromise; satisfy an " +
  "outgoing Promise-returning callback contract with a non-async function that " +
  "returns Effect.runPromise(effect)."

export const noAsyncFunctions = makeRule("no-async-functions")(noAsyncFunctionsScanner)(
  fixedRuleMessage(noAsyncFunctionsMessage, noAsyncFunctionsHint)
)

export const asynchronousFunctionRules: ReadonlyArray<Rule> = Array.make(
  noCallbacks,
  noAsyncFunctions
)

const noSwitchStatementsMessage = "Avoid switch statements."

const noSwitchStatementsHint =
  "Use Effect's Match module for pattern matching, and prefer Match.exhaustive " +
  "so every case is handled explicitly."

export const noSwitchStatements = makeRule("no-switch-statements")(noSwitchStatementsScanner)(
  fixedRuleMessage(noSwitchStatementsMessage, noSwitchStatementsHint)
)

const noNestedCallsHint =
  "A call whose result feeds another call hides a sequence of steps in one expression " +
  "that reads inside-out. Declare the inner result as a const (or a yield* step in a " +
  "gen block) and pass the name, or restructure data-last so the value flows through " +
  "pipe. Calls that return functions stay inline: currying and pipe stages read " +
  "left-to-right."

const makeNoNestedCallsRuleMessage: RuleMessage<
  typeof noNestedCallsScanner extends Scanner<infer Fact> ? Fact : never
> = () => (match: Match<typeof noNestedCallsScanner extends Scanner<infer Fact> ? Fact : never>) =>
  makeRuleMessage(
    `Avoid computing ${match.fact.callText} inline in the arguments of ${match.fact.consumerText}.`,
    noNestedCallsHint
  )

export const noNestedCalls = makeRule("no-nested-calls")(noNestedCallsScanner)(
  makeNoNestedCallsRuleMessage
)

export const declarativeControlRules: ReadonlyArray<Rule> = Array.make(
  noSwitchStatements,
  noFunctionKeyword,
  noInlineClosures,
  noNestedCalls
)

const noForInLoopsMessage = "Avoid imperative logic in for..in loops."

const noForInLoopsHint =
  "Use Effect's Record module, such as Record.map(), Record.reduce(), " +
  "or Record.toEntries(), instead."

export const noForInLoops = makeRule("no-for-in-loops")(noForInLoopsScanner)(
  fixedRuleMessage(noForInLoopsMessage, noForInLoopsHint)
)

const noForLoopsMessage = "Avoid imperative logic in iterator-based for loops."

const noForLoopsHint =
  "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
  "Array.filter(), or Array.flatMap(), instead."

export const noForLoops = makeRule("no-for-loops")(noForLoopsScanner)(
  fixedRuleMessage(noForLoopsMessage, noForLoopsHint)
)

const noForOfLoopsSynchronousHint =
  "Use Effect's Array module, such as Array.map(), Array.reduce(), " +
  "Array.filter(), or Array.flatMap(), instead."

const noForOfLoopsAsynchronousHint =
  "Use Stream.fromAsyncIterable(...).pipe(Stream.map(...), Stream.runCollect) or another " +
  "Stream/Effect combinator instead; Array combinators do not consume AsyncIterable values."

const noForOfLoopsRuleMessage: RuleMessage<
  typeof noForOfLoopsScanner extends Scanner<infer Fact> ? Fact : never
> = () => (match: Match<typeof noForOfLoopsScanner extends Scanner<infer Fact> ? Fact : never>) =>
  makeRuleMessage(
    "Avoid imperative logic in for..of loops.",
    match.fact.isAsync ? noForOfLoopsAsynchronousHint : noForOfLoopsSynchronousHint
  )

export const noForOfLoops =
  makeRule("no-for-of-loops")(noForOfLoopsScanner)(noForOfLoopsRuleMessage)

export const imperativeLoopRules: ReadonlyArray<Rule> = Array.make(
  noForInLoops,
  noForLoops,
  noForOfLoops
)

export const controlFlowRules: ReadonlyArray<Rule> = pipe(
  Array.make(asynchronousFunctionRules, imperativeLoopRules, declarativeControlRules),
  Array.flatten
)
