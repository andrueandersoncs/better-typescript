import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { scopedClientCache } from "../index.js"

test("scoped-client-cache has exact public Violation output", () =>
  assertRuleViolations(scopedClientCache, import.meta.dir, "effect-quality", "expected.json"))
