import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { unboundedStreamCollect } from "../index.js"

test("unbounded-stream-collect has exact public Violation output", () =>
  assertRuleViolations(unboundedStreamCollect, import.meta.dir, "effect-quality", "expected.json"))
