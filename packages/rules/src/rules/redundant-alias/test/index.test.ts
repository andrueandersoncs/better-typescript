import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { redundantAlias } from "../index.js"

test("redundant-alias has exact public Violation output", () =>
  assertRuleViolations(redundantAlias, import.meta.dir, "concept", "expected.json"))
