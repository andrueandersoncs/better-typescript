import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { schemaOptionalKey } from "../index.js"

test("schema-optional-key has exact public Violation output", () =>
  assertRuleViolations(schemaOptionalKey, import.meta.dir, "effect-quality", "expected.json"))
