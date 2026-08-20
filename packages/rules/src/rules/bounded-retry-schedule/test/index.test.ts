import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { boundedRetrySchedule } from "../index.js"

test("bounded-retry-schedule has exact public Violation output", () =>
  assertRuleViolations(boundedRetrySchedule, import.meta.dir, "effect-quality", "expected.json"))
