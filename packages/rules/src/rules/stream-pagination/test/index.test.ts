import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { streamPagination } from "../index.js"

test("stream-pagination has exact public Violation output", () =>
  assertRuleViolations(streamPagination, import.meta.dir, "effect-quality", "expected.json"))
