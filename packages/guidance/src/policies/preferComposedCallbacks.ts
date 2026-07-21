import { preferComposedCallbacksMatcher } from "@better-typescript/matchers/builtins/preferComposedCallbacks"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid inline callbacks that compose the callback parameter through calls."

const hint =
  "Use flow or pipe when the parameter moves through a composition. When no combinator expresses " +
  "the transformation, name the adapter in the nearest scope and pass it by reference."

export const preferComposedCallbacks = makeBuiltinPolicy(
  "prefer-composed-callbacks",
  preferComposedCallbacksMatcher,
  factGuidance(message, hint)
)
