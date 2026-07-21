import { Function, Match as EffectMatch, pipe } from "effect"
import type { Match } from "@better-typescript/matchers/matcher/data"
import { makeFindings } from "@better-typescript/core/engine/policy"
import { passThroughWrappers as passThroughWrappersMatcher } from "@better-typescript/matchers/builtins/passThroughWrappers"
import type { PassThroughWrapperData } from "@better-typescript/matchers/builtins/architectureExploreData"
import { makeSilentBuiltinPolicy } from "../definePolicy.js"

const reexportMessage =
  "Pass-through Module evidence — this public file only re-exports other Modules."

const reexportHint =
  "Use caller count in Architecture Explore Advice to apply the deletion test; a public entry Module with multiple callers may be earning its keep as the seam."

const forwardingMessage =
  "Pass-through export evidence — this operation forwards every parameter unchanged into one call."

const forwardingHint =
  "Use caller count in Architecture Explore Advice: delete low-leverage indirection, but keep operations whose behaviour or naming would otherwise reappear across callers."

const makePassThroughWrappersFindings = (match: Match<PassThroughWrapperData>) => {
  const makeReexportFindings = () =>
    makeFindings(match.target, reexportMessage, reexportHint, match.fact)

  const makeForwardingFindings = () =>
    makeFindings(match.target, forwardingMessage, forwardingHint, match.fact)

  return pipe(
    EffectMatch.value(match.fact),
    EffectMatch.when({ kind: "reexport" }, makeReexportFindings),
    EffectMatch.when({ kind: "forwarding-call" }, makeForwardingFindings),
    EffectMatch.exhaustive
  )
}

export const passThroughWrappers = makeSilentBuiltinPolicy(
  "pass-through-wrappers",
  passThroughWrappersMatcher,
  Function.constant(makePassThroughWrappersFindings)
)
