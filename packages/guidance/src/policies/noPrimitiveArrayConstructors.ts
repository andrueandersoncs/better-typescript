import { noPrimitiveArrayConstructorsMatcher } from "@better-typescript/matchers/builtins/noPrimitiveArrayConstructors"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Avoid primitive Array constructors."

const hint =
  "Use Effect's Array module instead — Array.empty() for an empty array, " +
  "Array.of(value) or Array.make(...) for elements, Array.allocate(n) for a " +
  "fixed length, and Array.fromIterable for an iterable."

export const noPrimitiveArrayConstructors = defineBuiltinPolicy(
  "no-primitive-array-constructors",
  noPrimitiveArrayConstructorsMatcher,
  factGuidance(message, hint)
)
