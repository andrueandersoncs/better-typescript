import * as ts from "typescript"
import { type Policy } from "@better-typescript/core/engine/policy/policyClass"
import { makePolicy } from "@better-typescript/core/engine/policy/makePolicy"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import { nodeMatcher } from "@better-typescript/matchers/matcher/nodeMatcher"
import { makeNodeMatch } from "@better-typescript/matchers/matcher/makeNodeMatch"
import { probeExamples } from "./reportProbeExamples.js"
import { probeHint } from "./reportProbeHint.js"
import { probeMessage } from "./reportProbeMessage.js"
import { unit } from "./reportUnit.js"

export const throwProbeMatcher = nodeMatcher([ts.SyntaxKind.ThrowStatement])(ts.isThrowStatement)(
  () => (node) => [makeNodeMatch(node, unit)]
)
export const throwProbePolicy: Policy = makePolicy({
  name: "probe throw statements",
  matcher: throwProbeMatcher,
  guidance: () => (match) => makeFindings(match.target, probeMessage, probeHint, unit),
  examples: probeExamples
})
