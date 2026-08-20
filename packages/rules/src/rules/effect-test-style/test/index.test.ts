import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { effectTestStyle } from "../index.js"

test("effect-test-style has exact public Violation output", () =>
  assertRuleViolations(effectTestStyle, import.meta.dir, "effect-quality", "expected.json"))
