import { type Policy } from "@better-typescript/core/engine/policy/policyClass"
import { makePolicy } from "@better-typescript/core/engine/policy/makePolicy"
import { makeFindings } from "@better-typescript/core/engine/policy/makeFindings"
import { fileMatcher } from "@better-typescript/matchers/matcher/fileMatcher"
import { makeFileMatch } from "@better-typescript/matchers/builtins/exportSurface"
import { probeExamples } from "./reportProbeExamples.js"
import { unit } from "./reportUnit.js"

export const fileVisitPolicy = (name: string, message: string, hint: string): Policy =>
  makePolicy({
    name,
    matcher: fileMatcher((context) => {
      const match = makeFileMatch(context.sourceFile, unit)
      return [match]
    }),
    guidance: () => (match) => makeFindings(match.target, message, hint, unit),
    examples: probeExamples
  })
