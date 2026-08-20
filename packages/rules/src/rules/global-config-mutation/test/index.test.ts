import { test } from "bun:test"
import { assertRuleViolations } from "../../../../../../tests/assertRuleViolations.js"
import { globalConfigMutation } from "../index.js"

test("global-config-mutation has exact public Violation output", () =>
  assertRuleViolations(globalConfigMutation, import.meta.dir, "effect-quality", "expected.json"))
