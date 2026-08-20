import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { httpResponseValidation } from "../index.js"

test("http-response-validation has exact public Violation output", () =>
  assertRuleViolations(httpResponseValidation, import.meta.dir, "effect-quality", "expected.json"))
