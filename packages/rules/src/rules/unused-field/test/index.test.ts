import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { unusedField } from "../index.js"

test("unused-field has exact public Violation output", () =>
  assertRuleViolations(unusedField, import.meta.dir, "concept", "expected.json"))
