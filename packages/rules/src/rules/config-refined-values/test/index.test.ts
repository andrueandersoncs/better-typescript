import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { configRefinedValues } from "../index.js"

test("config-refined-values has exact public Violation output", () =>
  assertRuleViolations(configRefinedValues, import.meta.dir, "effect-quality", "expected.json"))
