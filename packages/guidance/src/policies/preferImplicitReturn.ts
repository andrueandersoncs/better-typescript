import { preferImplicitReturnMatcher } from "@better-typescript/matchers/builtins/preferImplicitReturn"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid arrow function block bodies that only return a value."

const hint =
  "Replace this with an implicit return by removing the return statement and function " +
  "body braces. Wrap object literals in parentheses when needed."

export const preferImplicitReturn = makeBuiltinPolicy(
  "prefer-implicit-return",
  preferImplicitReturnMatcher,
  factGuidance(message, hint)
)
