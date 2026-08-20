import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { schemaClassModels } from "../index.js"

test("schema-class-models has exact public Violation output", () =>
  assertRuleViolations(schemaClassModels, import.meta.dir, "effect-quality", "expected.json"))
