import { oneFinding } from "@better-typescript/core/engine/policy"
import type { Guidance } from "@better-typescript/core/engine/policy/data"
import {
  noUndefinedMatcher,
  type NoUndefinedFact,
  type UndefinedUsageKind
} from "@better-typescript/matchers/builtins/noUndefined"
import { defineBuiltinPolicy } from "../definePolicy.js"

const optionHint =
  "Use Effect's Option module to model optional values, and convert nullable boundaries " +
  "with Option.fromNullishOr (incoming) and Option.getOrUndefined (outgoing). When a " +
  "third-party signature forces undefined on a callback, keep the callback inline or " +
  "annotate it with the library's own callback type so the undefined stays in the " +
  "library's declaration, not yours."

const undefinedMessages: Record<UndefinedUsageKind, string> = {
  parameter: "Avoid function parameters that accept undefined.",
  "return-type": "Avoid function return types that include undefined.",
  "return-expression": "Avoid returning undefined from functions.",
  "type-declaration": "Avoid optional or undefined properties in type declarations.",
  comparison: "Avoid comparing values against undefined."
}

const noUndefinedGuidance: Guidance<NoUndefinedFact> = () => (match) =>
  oneFinding(match.target, undefinedMessages[match.fact.kind], optionHint, match.fact)

export const noUndefined = defineBuiltinPolicy(
  "no-undefined",
  noUndefinedMatcher,
  noUndefinedGuidance
)
