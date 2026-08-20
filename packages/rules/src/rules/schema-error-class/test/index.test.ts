import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { schemaErrorClass } from "../index.js"

test("schema-error-class has exact public Violation output", () =>
  assertRuleViolations(schemaErrorClass, import.meta.dir, "effect-quality", "expected.json"))
