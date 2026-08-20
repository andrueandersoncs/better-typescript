import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { typedErrorRecovery } from "../index.js"

test("typed-error-recovery has exact public Violation output", () =>
  assertRuleViolations(typedErrorRecovery, import.meta.dir, "effect-quality", "expected.json"))
