import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { handrolledTtlCache } from "../index.js"

test("handrolled-ttl-cache has exact public Violation output", () =>
  assertRuleViolations(handrolledTtlCache, import.meta.dir, "effect-quality", "expected.json"))
