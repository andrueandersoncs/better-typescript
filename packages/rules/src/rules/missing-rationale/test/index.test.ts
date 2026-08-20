import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { missingRationale } from "../index.js"

test("missing-rationale has exact public Violation output", () =>
  assertRuleViolations(missingRationale, import.meta.dir, "concept", "expected.json"))
