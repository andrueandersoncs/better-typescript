import { testOnlyExports as testOnlyExportsMatcher } from "@better-typescript/matchers/builtins/testOnlyExports"
import { makeSilentBuiltinPolicy } from "../definePolicy.js"
import { factGuidance } from "../policyGuidance.js"

const message =
  "Test-only export evidence — production exposes this callable only so tests can reach implementation."

const hint =
  "Test through the same public interface as production callers, then make this internal helper private."

export const testOnlyExports = makeSilentBuiltinPolicy(
  "test-only-exports",
  testOnlyExportsMatcher,
  factGuidance(message, hint)
)
