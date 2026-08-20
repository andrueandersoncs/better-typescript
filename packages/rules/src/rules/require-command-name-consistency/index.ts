import { requireCommandNameConsistencyScanner } from "./requireCommandNameConsistency.js"

import { Function, pipe, Match as EffectMatch } from "effect"

import { makeRuleMessage } from "../../internal/rule/makeRuleMessage.js"

import type { Match } from "../../internal/scanner/match.js"

import type { Scanner } from "../../internal/scanner/scannerData.js"

import { makeRule } from "../../internal/rule/makeRule.js"

const makeRequireCommandNameConsistencyFindings = (
  match: Match<
    typeof requireCommandNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never
  >
) => {
  const makeFalseCommandFindings = (
    fact: Extract<
      typeof requireCommandNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never,
      { readonly kind: "false-command" }
    >
  ) =>
    makeRuleMessage(
      `${fact.nameText} claims the command ${fact.operation}, but its result and body do not provide command evidence.`,
      "Rename away from the command verb, or implement a true command with a void or Effect.void result."
    )

  const makeHiddenCommandFindings = (
    fact: Extract<
      typeof requireCommandNameConsistencyScanner extends Scanner<infer Fact> ? Fact : never,
      { readonly kind: "hidden-command" }
    >
  ) =>
    makeRuleMessage(
      `${fact.nameText} is a void command named like an accessor, projection, or result, not a command.`,
      "Rename with command language such as save, write, send, publish, set, update, remove, or delete."
    )

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "false-command" }, makeFalseCommandFindings),
    EffectMatch.when({ kind: "hidden-command" }, makeHiddenCommandFindings),
    EffectMatch.exhaustive
  )
}

export const requireCommandNameConsistency = makeRule("require-command-name-consistency")(
  requireCommandNameConsistencyScanner
)(Function.constant(makeRequireCommandNameConsistencyFindings))
