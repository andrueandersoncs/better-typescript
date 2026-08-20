import { preferFunctionCompositionScanner } from "./preferFunctionComposition.js"

import { Function, pipe, Match as EffectMatch } from "effect"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makePreferFunctionComposition = () => {
  const blockMessage = "Avoid block bodies that only bind a value and thread it into a call."

  const blockHint =
    "Use pipe, flow, or Function.compose (or a related Function combinator) so the " +
    "steps compose as an expression instead of a manually threaded local. Do not nest " +
    "the calls."

  const adapterMessage = "Avoid unary adapters that project a property into a partial function."

  const effectPipelineMessage =
    "Avoid straight-line Effect transformations threaded through single-use bindings."

  const effectPipelineHint =
    "Use one data-last pipe from the source Effect through each transformation and Effect.runPromise."

  const adapterHint = (typeText: string) => (propertyName: string) => (partialText: string) =>
    `Use flow(Struct.get<${typeText}>(${JSON.stringify(propertyName)}), ${partialText}) instead.`

  const makePreferFunctionCompositionFindings = (
    match: Match<typeof preferFunctionCompositionScanner extends Scanner<infer Fact> ? Fact : never>
  ) => {
    const makeBlockFindings = () => makeRuleMessage(blockMessage, blockHint)

    const makeAdapterFindings = (
      fact: Extract<
        typeof preferFunctionCompositionScanner extends Scanner<infer Fact> ? Fact : never,
        { readonly kind: "adapter" }
      >
    ) => {
      const hint = adapterHint(fact.typeText)(fact.propertyName)(fact.partialText)

      return makeRuleMessage(adapterMessage, hint)
    }

    const makeEffectPipelineFindings = () =>
      makeRuleMessage(effectPipelineMessage, effectPipelineHint)

    return pipe(
      EffectMatch.value(match.fact),
      EffectMatch.when({ kind: "block" }, makeBlockFindings),
      EffectMatch.when({ kind: "adapter" }, makeAdapterFindings),
      EffectMatch.when({ kind: "effect-pipeline" }, makeEffectPipelineFindings),
      EffectMatch.exhaustive
    )
  }

  const preferFunctionComposition = makeRule("prefer-function-composition")(
    preferFunctionCompositionScanner
  )(Function.constant(makePreferFunctionCompositionFindings))

  return preferFunctionComposition
}

export const preferFunctionComposition = makePreferFunctionComposition()
