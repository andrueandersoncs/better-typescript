import { noWeakMapMatcher } from "@better-typescript/matchers/builtins/noWeakMap"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid WeakMap because it keeps mutable state outside Effect."

const hint =
  "Store immutable state in an Effect Ref instead. Use SynchronizedRef when updates are " +
  "effectful, or SubscriptionRef when consumers need a stream of changes. Create the " +
  "reference inside an Effect or Layer instead of retaining a module-level WeakMap."

export const noWeakMap = makeBuiltinPolicy(
  "no-weak-map",
  noWeakMapMatcher,
  factGuidance(message, hint)
)
