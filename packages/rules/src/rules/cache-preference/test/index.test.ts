import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { cachePreference } from "../index.js"

test("cache-preference has exact public Violation output", () =>
  assertRuleViolations(cachePreference, import.meta.dir, "effect-quality", "expected.json"))
