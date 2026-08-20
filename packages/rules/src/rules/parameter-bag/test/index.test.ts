import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { parameterBag } from "../index.js"

test("parameter-bag has exact public Violation output", () =>
  assertRuleViolations(parameterBag, import.meta.dir, "concept", "expected.json"))
