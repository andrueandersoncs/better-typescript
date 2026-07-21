import { moduleIdentity as moduleIdentityMatcher } from "@better-typescript/matchers/builtins/moduleIdentity"
import { makeSilentBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message =
  "Module identity evidence — this source file publishes one or more package export aliases."

const hint =
  "Aliases come from package.json exports matched to the file's emitted path; missing outDir yields no identity evidence."

export const moduleIdentity = makeSilentBuiltinPolicy(
  "module-identity",
  moduleIdentityMatcher,
  factGuidance(message, hint)
)
