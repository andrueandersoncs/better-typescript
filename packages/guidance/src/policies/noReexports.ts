import { noReexportsMatcher } from "@better-typescript/matchers/builtins/noReexports"
import { defineBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Do not re-export imported bindings."

const hint =
  "Import the dependency where it is used and expose a locally defined public interface instead."

export const noReexports = defineBuiltinPolicy(
  "no-reexports",
  noReexportsMatcher,
  factGuidance(message, hint)
)
