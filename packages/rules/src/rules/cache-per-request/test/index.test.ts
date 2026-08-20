import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { cachePerRequest } from "../index.js"

test("cache-per-request has exact public Violation output", () =>
  assertRuleViolations(cachePerRequest, import.meta.dir, "effect-quality", "expected.json"))
