import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { functionDerivedModel } from "../index.js"

test("function-derived-model has exact public Violation output", () =>
  assertRuleViolations(functionDerivedModel, import.meta.dir, "concept", "expected.json"))
