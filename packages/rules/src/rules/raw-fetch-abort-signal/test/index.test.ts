import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { rawFetchAbortSignal } from "../index.js"

test("raw-fetch-abort-signal has exact public Violation output", () =>
  assertRuleViolations(rawFetchAbortSignal, import.meta.dir, "effect-quality", "expected.json"))
