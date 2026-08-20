import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { passThroughConversion } from "../index.js"

test("pass-through-conversion has exact public Violation output", () =>
  assertRuleViolations(passThroughConversion, import.meta.dir, "concept", "expected.json"))
