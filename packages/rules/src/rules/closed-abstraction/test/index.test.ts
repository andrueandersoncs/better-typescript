import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { closedAbstraction } from "../index.js"

test("closed-abstraction has exact public Violation output", () =>
  assertRuleViolations(closedAbstraction, import.meta.dir, "concept", "expected.json"))
