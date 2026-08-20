import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { rawFetchOutsideAdapter } from "../index.js"

test("raw-fetch-outside-adapter has exact public Violation output", () =>
  assertRuleViolations(rawFetchOutsideAdapter, import.meta.dir, "effect-quality", "expected.json"))
