import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { duplicateShape } from "../index.js"

test("duplicate-shape has exact public Violation output", () =>
  assertRuleViolations(duplicateShape, import.meta.dir, "concept", "expected.json"))
