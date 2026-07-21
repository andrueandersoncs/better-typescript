import { Function, Option, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { oneFinding } from "@better-typescript/core/engine/policy"
import {
  preferEffectFnMatcher,
  type PreferEffectFnFact
} from "@better-typescript/matchers/builtins/preferEffectFn"
import { defineBuiltinPolicy } from "../definePolicy.js"

const ordinaryHint = (functionName: string) =>
  `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(function* (...) ` +
  "{ ... }): Effect.fn subsumes the Effect.gen wrapper and runs every call inside a " +
  "traced span."

const selfBoundHint = (functionName: string, selfBinding: string, thisType: string) =>
  `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(${selfBinding}, ` +
  `function*(this: ${thisType}, ...) { ... }): Effect.fn subsumes the Effect.gen wrapper ` +
  "and runs every call inside a traced span."

const defaultThisType = "..."
const defaultThisTypeFallback = Function.constant(defaultThisType)

const preferEffectFnFindings = (match: Match<PreferEffectFnFact>) => {
  const { functionName } = match.fact
  const selfBinding = Option.fromNullishOr(match.fact.selfBindingText)

  const thisType = pipe(
    Option.fromNullishOr(match.fact.thisTypeText),
    Option.getOrElse(defaultThisTypeFallback)
  )

  const ordinaryHintForName = () => ordinaryHint(functionName)

  const selfBoundHintForBinding = (selfBindingText: string) =>
    selfBoundHint(functionName, selfBindingText, thisType)

  const hint = pipe(
    selfBinding,
    Option.match({
      onNone: ordinaryHintForName,
      onSome: selfBoundHintForBinding
    })
  )

  return oneFinding(
    match.target,
    `Avoid wrapping the body of ${functionName} in Effect.gen; use Effect.fn.`,
    hint,
    match.fact
  )
}

export const preferEffectFn = defineBuiltinPolicy(
  "prefer-effect-fn",
  preferEffectFnMatcher,
  Function.constant(preferEffectFnFindings)
)
