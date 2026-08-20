import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { productionSleepLoops } from "../index.js"

test("production-sleep-loops has exact public Violation output", () =>
  assertRuleViolations(productionSleepLoops, import.meta.dir, "effect-quality", "expected.json"))
