import { noReexportsMatcher } from "@better-typescript/matchers/builtins/noReexports"
import { makeBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message = "Do not re-export imported bindings."

const hint =
  "Import the dependency where it is used and expose a locally defined public interface instead."

export const noReexports = makeBuiltinPolicy(
  "no-reexports",
  noReexportsMatcher,
  factGuidance(message, hint)
)
