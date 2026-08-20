import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { preferContextServiceClass } from "../index.js"

test("prefer-context-service-class has exact public Violation output", () =>
  assertRuleViolations(
    preferContextServiceClass,
    import.meta.dir,
    "effect-quality",
    "effectQuality.expected.json"
  ))
