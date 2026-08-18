import * as ts from "typescript"
import { type Advice } from "@better-typescript/core/engine/derive/advice"
import { Location } from "@better-typescript/core/engine/location/locationData"
import { makeWiring } from "@better-typescript/core/engine/wiring/makeWiring"
import { makePolicy } from "@better-typescript/core/engine/policy/makePolicy"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import { nodeMatcher } from "@better-typescript/matchers/matcher/nodeMatcher"
import { makeNodeMatch } from "@better-typescript/matchers/matcher/makeNodeMatch"
import { probeExamples } from "./watchProbeExamples.js"
import { probeName } from "./watchProbeName.js"
import { Effect } from "effect"

export const probeMessage = "throw statement"
export const probeHint = "yield typed errors instead of throwing"

export const throwProbePolicy = makePolicy({
  name: probeName,
  matcher: nodeMatcher([ts.SyntaxKind.ThrowStatement])(ts.isThrowStatement)(() => (node) => [
    makeNodeMatch(node, null)
  ]),
  guidance: () => (match) => makeFindings(match.target, probeMessage, probeHint, null),
  examples: probeExamples
})

export const probeWiring = makeWiring({
  policies: [throwProbePolicy],
  derive: (signals) => {
    const detectionCount = signals[0]?.detections.length ?? 0

    if (detectionCount === 0) {
      return Effect.succeed([])
    }
    const advice: Advice = {
      location: Location.make({ path: "src/cases.ts", line: 1, column: 1 }),
      level: "file",
      title: "probe advice",
      remediation: `handle ${detectionCount} throws`,
      evidence: [{ measure: "throw statements", count: detectionCount }],
      examples: probeExamples
    }

    return Effect.succeed([advice])
  }
})
