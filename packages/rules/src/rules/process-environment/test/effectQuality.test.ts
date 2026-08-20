import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { processEnvironment } from "../index.js"

test("process-environment has exact public Violation output", () =>
  assertRuleViolations(
    processEnvironment,
    import.meta.dir,
    "effect-quality",
    "effectQuality.expected.json"
  ))
