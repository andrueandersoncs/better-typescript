import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { unsafeCasts } from "../index.js"

test("unsafe-casts has exact public Violation output", () =>
  assertRuleViolations(unsafeCasts, import.meta.dir, "effect-quality", "expected.json"))
