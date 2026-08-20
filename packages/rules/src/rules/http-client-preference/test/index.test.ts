import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { httpClientPreference } from "../index.js"

test("http-client-preference has exact public Violation output", () =>
  assertRuleViolations(httpClientPreference, import.meta.dir, "effect-quality", "expected.json"))
