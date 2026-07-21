import { Function, Match as EffectMatch, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { oneFinding } from "@better-typescript/core/engine/policy"
import {
  requireCommandNameConsistencyMatcher,
  type RequireCommandFalseCommandFact,
  type RequireCommandHiddenCommandFact,
  type RequireCommandNameConsistencyFact
} from "@better-typescript/matchers/builtins/requireCommandNameConsistency"
import { defineBuiltinPolicy } from "../definePolicy.js"

const requireCommandNameConsistencyFindings = (match: Match<RequireCommandNameConsistencyFact>) => {
  const falseCommandFindings = (fact: RequireCommandFalseCommandFact) =>
    oneFinding(
      match.target,
      `${fact.nameText} claims the command ${fact.operation}, but its result and body do not provide command evidence.`,
      "Rename away from the command verb, or implement a true command with a void or Effect.void result.",
      match.fact
    )

  const hiddenCommandFindings = (fact: RequireCommandHiddenCommandFact) =>
    oneFinding(
      match.target,
      `${fact.nameText} is a void command named like an accessor, projection, or result, not a command.`,
      "Rename with command language such as save, write, send, publish, set, update, remove, or delete.",
      match.fact
    )

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "false-command" }, falseCommandFindings),
    EffectMatch.when({ kind: "hidden-command" }, hiddenCommandFindings),
    EffectMatch.exhaustive
  )
}

export const requireCommandNameConsistency = defineBuiltinPolicy(
  "require-command-name-consistency",
  requireCommandNameConsistencyMatcher,
  Function.constant(requireCommandNameConsistencyFindings)
)
