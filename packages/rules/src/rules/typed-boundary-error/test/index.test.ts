import { test } from "bun:test"
import { assertRuleViolations } from "../../../../test/assertRuleViolations.js"
import { typedBoundaryError } from "../index.js"

test("typed-boundary-error has exact public Violation output", () =>
  assertRuleViolations(typedBoundaryError, import.meta.dir, "effect-quality", "expected.json"))
