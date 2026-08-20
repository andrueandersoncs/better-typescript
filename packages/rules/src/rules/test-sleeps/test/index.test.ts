import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { testSleeps } from "../index.js"

test("test-sleeps has exact public Violation output", () =>
  assertRuleViolations(testSleeps, import.meta.dir, "effect-quality", "expected.json"))
