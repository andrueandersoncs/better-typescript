import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { unboundedStreamBuffer } from "../index.js"

test("unbounded-stream-buffer has exact public Violation output", () =>
  assertRuleViolations(unboundedStreamBuffer, import.meta.dir, "effect-quality", "expected.json"))
