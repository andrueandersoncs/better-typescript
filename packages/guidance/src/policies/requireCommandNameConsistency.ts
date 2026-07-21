import { Function, Match as EffectMatch, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { makeFindings } from "@better-typescript/core/engine/policy"
import {
  requireCommandNameConsistencyMatcher,
  type RequireCommandFalseCommandFact,
  type RequireCommandHiddenCommandFact,
  type RequireCommandNameConsistencyFact
} from "@better-typescript/matchers/builtins/requireCommandNameConsistency"
import { makeBuiltinPolicy } from "../definePolicy.js"

const makeRequireCommandNameConsistencyFindings = (
  match: Match<RequireCommandNameConsistencyFact>
) => {
  const makeFalseCommandFindings = (fact: RequireCommandFalseCommandFact) =>
    makeFindings(
      match.target,
      `${fact.nameText} claims the command ${fact.operation}, but its result and body do not provide command evidence.`,
      "Rename away from the command verb, or implement a true command with a void or Effect.void result.",
      match.fact
    )

  const makeHiddenCommandFindings = (fact: RequireCommandHiddenCommandFact) =>
    makeFindings(
      match.target,
      `${fact.nameText} is a void command named like an accessor, projection, or result, not a command.`,
      "Rename with command language such as save, write, send, publish, set, update, remove, or delete.",
      match.fact
    )

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "false-command" }, makeFalseCommandFindings),
    EffectMatch.when({ kind: "hidden-command" }, makeHiddenCommandFindings),
    EffectMatch.exhaustive
  )
}

export const requireCommandNameConsistency = makeBuiltinPolicy(
  "require-command-name-consistency",
  requireCommandNameConsistencyMatcher,
  Function.constant(makeRequireCommandNameConsistencyFindings)
)
