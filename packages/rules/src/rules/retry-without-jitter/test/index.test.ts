import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { retryWithoutJitter } from "../index.js"

test("retry-without-jitter has exact public Violation output", () =>
  assertRuleViolations(retryWithoutJitter, import.meta.dir, "effect-quality", "expected.json"))
