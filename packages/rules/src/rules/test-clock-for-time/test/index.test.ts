import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { testClockForTime } from "../index.js"

test("test-clock-for-time has exact public Violation output", () =>
  assertRuleViolations(testClockForTime, import.meta.dir, "effect-quality", "expected.json"))
