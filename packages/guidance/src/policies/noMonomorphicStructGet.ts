import { noMonomorphicStructGetMatcher } from "@better-typescript/matchers/builtins/noMonomorphicStructGet"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid monomorphizing Struct.get at its declaration."

const hint =
  "Keep Struct.get polymorphic. Inline it at a typed consumer, or put the " +
  "domain type on the consuming value or result rather than on the getter."

export const noMonomorphicStructGet = makeBuiltinPolicy(
  "no-monomorphic-struct-get",
  noMonomorphicStructGetMatcher,
  factGuidance(message, hint)
)
