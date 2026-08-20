import { preferEffectFnScanner } from "./preferEffectFn.js"

import { Function, pipe, Option } from "effect"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makePreferEffectFn = () => {
  const ordinaryHint = (functionName: string) =>
    `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(function* (...) ` +
    "{ ... }): Effect.fn subsumes the Effect.gen wrapper and runs every call inside a " +
    "traced span."

  const selfBoundHint = (functionName: string) => (thisType: string) => (selfBinding: string) =>
    `Rewrite it as const ${functionName} = Effect.fn("${functionName}")(${selfBinding}, ` +
    `function*(this: ${thisType}, ...) { ... }): Effect.fn subsumes the Effect.gen wrapper ` +
    "and runs every call inside a traced span."

  const defaultThisType = "..."
  const defaultThisTypeFallback = Function.constant(defaultThisType)

  const makePreferEffectFnFindings = (
    match: Match<typeof preferEffectFnScanner extends Scanner<infer Fact> ? Fact : never>
  ) => {
    const { functionName } = match.fact
    const selfBinding = Option.fromNullishOr(match.fact.selfBindingText)

    const thisType = pipe(
      Option.fromNullishOr(match.fact.thisTypeText),
      Option.getOrElse(defaultThisTypeFallback)
    )

    const ordinaryHintForName = () => ordinaryHint(functionName)
    const selfBoundHintForBinding = selfBoundHint(functionName)(thisType)

    const hint = pipe(
      selfBinding,
      Option.match({
        onNone: ordinaryHintForName,
        onSome: selfBoundHintForBinding
      })
    )

    return makeRuleMessage(
      `Avoid wrapping the body of ${functionName} in Effect.gen; use Effect.fn.`,
      hint
    )
  }

  const preferEffectFn = makeRule("prefer-effect-fn")(preferEffectFnScanner)(
    Function.constant(makePreferEffectFnFindings)
  )

  return preferEffectFn
}

export const preferEffectFn = makePreferEffectFn()
