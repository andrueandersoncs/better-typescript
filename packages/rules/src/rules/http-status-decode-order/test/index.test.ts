import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { httpStatusDecodeOrder } from "../index.js"

test("http-status-decode-order has exact public Violation output", () =>
  assertRuleViolations(httpStatusDecodeOrder, import.meta.dir, "effect-quality", "expected.json"))
