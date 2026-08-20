import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { idempotentRetry } from "../index.js"

test("idempotent-retry has exact public Violation output", () =>
  assertRuleViolations(idempotentRetry, import.meta.dir, "effect-quality", "expected.json"))
