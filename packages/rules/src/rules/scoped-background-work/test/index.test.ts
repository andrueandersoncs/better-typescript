import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { scopedBackgroundWork } from "../index.js"

test("scoped-background-work has exact public Violation output", () =>
  assertRuleViolations(scopedBackgroundWork, import.meta.dir, "effect-quality", "expected.json"))
