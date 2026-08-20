import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { schemaRecordInterface } from "../index.js"

test("schema-record-interface has exact public Violation output", () =>
  assertRuleViolations(schemaRecordInterface, import.meta.dir, "effect-quality", "expected.json"))
